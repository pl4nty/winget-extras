import { describe, expect, test } from 'bun:test';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import {
	createUpstreamVersionsRule,
	lookupUpstreamVersion,
	upstreamManifestPath,
	type UpstreamLookup,
} from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

function versionRecord(identifier: string, version: string) {
	return record('version', {
		directory: `manifests/${identifier.slice(0, 1).toLowerCase()}/${identifier.split('.').join('/')}/${version}`,
		file: `manifests/${identifier.slice(0, 1).toLowerCase()}/${identifier.split('.').join('/')}/${version}/${identifier}.yaml`,
		manifest: {
			...manifest('version'),
			PackageIdentifier: identifier,
			PackageVersion: version,
		} as WingetManifest,
	});
}

/** The lookup only ever passes a URL string, so the stub can take one directly. */
async function withFetch<T>(
	stub: (input: string, init?: RequestInit) => Promise<Response>,
	run: () => Promise<T>,
): Promise<T> {
	const original = globalThis.fetch;
	globalThis.fetch = stub as typeof globalThis.fetch;
	try {
		return await run();
	} finally {
		globalThis.fetch = original;
	}
}

describe('upstream versions rule', () => {
	test('warns once for a package version that winget-pkgs already publishes', async () => {
		const issues = await checkRule(
			createUpstreamVersionsRule(async () => true),
			{
				records: [record('version'), record('installer'), record('defaultLocale')],
			},
		);
		expect(messages(issues)).toEqual(['Acme.App 1.0 already exists in microsoft/winget-pkgs']);
		expect(issues.at(0)?.level).toBe('warning');
		expect(issues.at(0)?.file).toBe('manifests/a/Acme/App/1.0/Acme.App.yaml');
	});

	test('reports a manifest set without a version manifest', async () => {
		const issues = await checkRule(
			createUpstreamVersionsRule(async () => true),
			{
				records: [record('installer')],
			},
		);
		expect(issues.at(0)?.file).toBe('manifests/a/Acme/App/1.0/Acme.App.installer.yaml');
	});

	test('accepts versions that are missing upstream', async () => {
		const issues = await checkRule(
			createUpstreamVersionsRule(async () => false),
			{
				records: [record('version')],
			},
		);
		expect(issues).toEqual([]);
	});

	test('stays silent when upstream cannot be reached', async () => {
		const rejected = await checkRule(
			createUpstreamVersionsRule(() => Promise.reject(new Error('offline'))),
			{ records: [record('version')] },
		);
		const unanswered = await checkRule(
			createUpstreamVersionsRule(async () => undefined),
			{
				records: [record('version')],
			},
		);
		expect(rejected).toEqual([]);
		expect(unanswered).toEqual([]);
	});

	test('stops probing after repeated lookup failures', async () => {
		const records = Array.from({ length: 200 }, (_, index) =>
			versionRecord(`Acme.App${index}`, '1.0'),
		);
		let calls = 0;
		const lookup: UpstreamLookup = async () => {
			calls++;
			throw new Error('offline');
		};
		expect(await checkRule(createUpstreamVersionsRule(lookup), { records })).toEqual([]);
		expect(calls).toBeLessThan(records.length);
	});

	test('builds the upstream manifest path from the identifier and version', () => {
		expect(upstreamManifestPath('Microsoft.DeploymentToolkit', '6.3.8456.1000')).toBe(
			'manifests/m/Microsoft/DeploymentToolkit/6.3.8456.1000/Microsoft.DeploymentToolkit.yaml',
		);
		expect(upstreamManifestPath('Acme.App', '1.0+build 2')).toBe(
			'manifests/a/Acme/App/1.0%2Bbuild%202/Acme.App.yaml',
		);
	});

	test('maps upstream responses to lookup results', async () => {
		const requests: Array<[string, string | undefined]> = [];
		const respond = (status: number) => async (input: string, init?: RequestInit) => {
			requests.push([input, init?.method]);
			return new Response(undefined, { status });
		};

		expect(await withFetch(respond(200), () => lookupUpstreamVersion('Acme.App', '1.0'))).toBe(
			true,
		);
		expect(await withFetch(respond(404), () => lookupUpstreamVersion('Acme.App', '1.0'))).toBe(
			false,
		);
		expect(
			await withFetch(respond(500), () => lookupUpstreamVersion('Acme.App', '1.0')),
		).toBeUndefined();
		expect(requests.at(0)).toEqual([
			'https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/manifests/a/Acme/App/1.0/Acme.App.yaml',
			'HEAD',
		]);
	});
});
