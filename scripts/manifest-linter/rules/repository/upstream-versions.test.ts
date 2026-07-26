import { expect, test } from 'bun:test';

import { upstreamVersionsRule } from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { checkRule, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

async function checkWithUpstream(status: number | Error) {
	const original = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = (async (url: string) => {
		requests.push(url);
		if (status instanceof Error) throw status;
		return new Response(undefined, { status });
	}) as typeof globalThis.fetch;
	try {
		const issues = await checkRule(upstreamVersionsRule, {
			records: [record('version'), record('installer'), record('defaultLocale')],
		});
		return { issues, requests };
	} finally {
		globalThis.fetch = original;
	}
}

test('upstream versions rule warns for a version winget-pkgs already publishes', async () => {
	const { issues, requests } = await checkWithUpstream(200);
	expect(messages(issues)).toEqual(['PackageVersion 1.0 already exists in microsoft/winget-pkgs']);
	expect(issues.at(0)?.level).toBe('warning');
	expect(requests).toEqual([
		'https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/manifests/a/Acme/App/1.0/Acme.App.yaml',
	]);
});

test('upstream versions rule accepts new versions and an unreachable upstream', async () => {
	expect((await checkWithUpstream(404)).issues).toEqual([]);
	expect((await checkWithUpstream(new Error('offline'))).issues).toEqual([]);
});
