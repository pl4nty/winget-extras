import { afterEach, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { dryRunRule } from '@/scripts/manifest-linter/rules/repository/dry-run';
import { checkRule, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

const installer = (values: string) => `# Created by Anthelion using komac v2.17.0
PackageIdentifier: Acme.App
PackageVersion: 1.0
InstallerType: inno
${values}Installers:
- Architecture: x64
ManifestType: installer
ManifestVersion: 1.28.0
`;

const version = `# Created by Anthelion using komac v2.17.0
PackageIdentifier: Acme.App
PackageVersion: 1.0
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.28.0
`;

async function checkDryRun(output: string, changed: string[] = []) {
	const log = join(await mkdtemp(join(tmpdir(), 'dry-run-')), 'dry-run.log');
	await writeFile(
		log,
		`\x1b[34m==>\x1b[39m Running Acme.App.json\nVersion: 1.0\nURLs: https://example.com\n\n${output}\nPull request URL: Dry Run\n`,
	);
	process.env.DRY_RUN_LOG = log;
	process.env.CHANGED_MANIFESTS = JSON.stringify(changed);
	return checkRule(dryRunRule, {
		records: [
			record('installer', { raw: installer('Scope: machine\n') }),
			record('version', { raw: version }),
		],
	});
}

afterEach(() => {
	delete process.env.DRY_RUN_LOG;
	delete process.env.CHANGED_MANIFESTS;
});

test('dry run rule accepts matching manifests and does nothing without a log', async () => {
	expect(await checkRule(dryRunRule, { records: [record('version')] })).toEqual([]);
	expect(await checkDryRun(`${installer('Scope: machine\n')}\n${version}`)).toEqual([]);
});

test('dry run rule reports each drifted field', async () => {
	const issues = await checkDryRun(`${installer('Scope: user\n')}\n${version}`);
	expect(messages(issues)).toEqual(['Scope is "machine", shard dry run has "user"']);
	expect(issues[0]?.search).toBe('machine');
});

test('dry run rule reports manifests only one side has', async () => {
	expect(messages(await checkDryRun(installer('Scope: machine\n')))).toEqual([
		'shard dry run does not generate this manifest',
	]);
});

test('dry run rule fails a version mismatch only when the package changed', async () => {
	const output = installer('Scope: machine\n').replace(
		'PackageVersion: 1.0',
		'PackageVersion: 2.0',
	);
	expect((await checkDryRun(output)).map((issue) => issue.level)).toEqual(['warning']);
	const issues = await checkDryRun(output, ['manifests/a/Acme/App/1.0/Acme.App.yaml']);
	expect(messages(issues)).toEqual(['shard dry run found version 2, which has no manifests']);
	expect(issues[0]?.level).toBe('error');
});
