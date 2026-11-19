import { Database } from 'bun:sqlite';
import { expect, test } from 'bun:test';

import { zipSync } from 'fflate';

import { upstreamVersionsRule } from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

function versionRecord(version: string) {
	return record('version', {
		directory: `manifests/a/Acme/App/${version}`,
		manifest: { ...manifest('version'), PackageVersion: version },
	});
}

function source(packages: Record<string, string>): Uint8Array {
	const database = new Database(':memory:');
	database.run('CREATE TABLE packages (id TEXT NOT NULL, latest_version TEXT NOT NULL)');
	for (const [id, version] of Object.entries(packages)) {
		database.run('INSERT INTO packages VALUES (?, ?)', [id, version]);
	}
	const index = database.serialize();
	database.close();
	return zipSync({ 'Public/index.db': index });
}

async function checkWithUpstream(response: Uint8Array | Error, versions = ['1.0']) {
	const original = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const request = input instanceof Request ? input : new Request(input.toString(), init);
		requests.push(request.url);
		if (response instanceof Error) throw response;
		return new Response(response);
	}) as typeof globalThis.fetch;
	try {
		const issues = await checkRule(upstreamVersionsRule, {
			records: [...versions.map(versionRecord), record('installer'), record('defaultLocale')],
		});
		return { issues, requests };
	} finally {
		globalThis.fetch = original;
	}
}

test('upstream versions rule warns for a version winget-pkgs already publishes', async () => {
	const { issues, requests } = await checkWithUpstream(source({ 'acme.APP': '1.0.0' }));
	expect(messages(issues)).toEqual(['PackageVersion 1.0 already exists in microsoft/winget-pkgs']);
	expect(issues.at(0)?.level).toBe('warning');
	expect(requests).toEqual(['https://cdn.winget.microsoft.com/cache/source2.msix']);
});

test('upstream versions rule warns for a newer upstream version', async () => {
	const { issues } = await checkWithUpstream(source({ 'Acme.App': '1.10' }), ['1.0', '1.9']);
	expect(messages(issues)).toEqual([
		'microsoft/winget-pkgs has newer version 1.10 than PackageVersion 1.9',
	]);
	expect(issues.at(0)?.file).toBe('manifests/a/Acme/App/1.9/Acme.App.yaml');
});

test('upstream versions rule accepts packages ahead of upstream', async () => {
	expect((await checkWithUpstream(source({ 'Acme.App': '1.5' }), ['1.0', '2.0'])).issues).toEqual(
		[],
	);
	expect((await checkWithUpstream(source({ 'Acme.Other': '2.0' }))).issues).toEqual([]);
});

test('upstream versions rule warns when upstream is unreachable', async () => {
	expect(messages((await checkWithUpstream(new Error('offline'))).issues)).toEqual([
		'could not read https://cdn.winget.microsoft.com/cache/source2.msix: offline',
	]);
	expect(messages((await checkWithUpstream(new Uint8Array())).issues)).toHaveLength(1);
});
