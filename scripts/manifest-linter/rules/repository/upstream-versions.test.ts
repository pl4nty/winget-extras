import { expect, test } from 'bun:test';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { upstreamVersionsRule } from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';
import type { ReportedDiagnostic } from '@/scripts/manifest-linter/types';

const UPSTREAM_URL =
	'https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/manifests/a/Acme/App/1.0/Acme.App.yaml';

async function checkWithUpstream(
	respond: (url: string) => Response | Promise<Response>,
	records = [record('version'), record('installer'), record('defaultLocale')],
): Promise<{ issues: ReportedDiagnostic[]; requests: string[] }> {
	const original = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = (async (input: string, init?: RequestInit) => {
		expect(init?.method).toBe('HEAD');
		requests.push(input);
		return respond(input);
	}) as typeof globalThis.fetch;
	try {
		return { issues: await checkRule(upstreamVersionsRule, { records }), requests };
	} finally {
		globalThis.fetch = original;
	}
}

test('upstream versions rule warns once for a version winget-pkgs already publishes', async () => {
	const { issues, requests } = await checkWithUpstream(() => new Response(undefined));
	expect(messages(issues)).toEqual(['Acme.App 1.0 already exists in microsoft/winget-pkgs']);
	expect(issues.at(0)?.level).toBe('warning');
	expect(issues.at(0)?.file).toBe('manifests/a/Acme/App/1.0/Acme.App.yaml');
	expect(requests).toEqual([UPSTREAM_URL]);
});

test('upstream versions rule accepts versions that are missing upstream', async () => {
	const { issues } = await checkWithUpstream(() => new Response(undefined, { status: 404 }));
	expect(issues).toEqual([]);
});

test('upstream versions rule stops probing when upstream is unreachable', async () => {
	const records = Array.from({ length: 40 }, (_, index) =>
		record('version', {
			file: `manifests/a/Acme/App${index}/1.0/Acme.App${index}.yaml`,
			manifest: { ...manifest('version'), PackageIdentifier: `Acme.App${index}` } as WingetManifest,
		}),
	);
	const { issues, requests } = await checkWithUpstream(
		() => Promise.reject(new Error('offline')),
		records,
	);
	expect(issues).toEqual([]);
	expect(requests.length).toBeLessThan(records.length);
});
