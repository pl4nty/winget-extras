import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { dryRunRule } from '@/scripts/manifest-linter/rules/repository/dry-run';
import { checkRule, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

const installer = (scope: string) => `PackageIdentifier: Acme.App
PackageVersion: 1.0
InstallerType: inno
Scope: ${scope}
Installers:
- Architecture: x64
ManifestType: installer
ManifestVersion: 1.28.0`;

const file = (version: string) => `manifests/a/Acme/App/${version}/Acme.App.installer.yaml`;

async function checkDryRun(manifests: Record<string, string>, committed = installer('machine')) {
	const summary = join(await mkdtemp(join(tmpdir(), 'dry-run-')), 'summary.md');
	await writeFile(
		summary,
		Object.entries(manifests)
			.map(([path, yaml]) => `#### ${path}\n\n\`\`\`yaml\n${yaml}\n\`\`\`\n`)
			.join('\n'),
	);
	process.env.DRY_RUN_SUMMARY = summary;
	return checkRule(dryRunRule, {
		records: [record('installer', { raw: `# Created with komac\n${committed}\n` })],
	});
}

afterEach(() => {
	delete process.env.DRY_RUN_SUMMARY;
});

test('dry run rule accepts matching manifests', async () => {
	expect(await checkDryRun({ [file('1.0')]: installer('machine') })).toEqual([]);
});

test('dry run rule reports each drifted field at the committed value', async () => {
	const issues = await checkDryRun({ [file('1.0')]: installer('user') });
	expect(messages(issues)).toEqual(['Scope is "machine", shard dry run has "user"']);
	expect(issues[0]?.search).toBe('machine');
	expect(issues[0]?.level).toBe('warning');
});

test('dry run rule warns about an uncommitted version', async () => {
	const issues = await checkDryRun({ [file('2.0')]: installer('machine') });
	expect(messages(issues)).toEqual([
		'shard dry run generates this manifest, but it is not committed',
	]);
	expect(issues[0]?.level).toBe('warning');
});

test('dry run rule ignores tags', async () => {
	const tagged = (...tags: string[]) =>
		`${installer('machine')}\nTags:\n${tags.map((tag) => `- ${tag}`).join('\n')}`;
	expect(await checkDryRun({ [file('1.0')]: tagged('b', 'a', 'c') }, tagged('a', 'b'))).toEqual([]);
});
