import { expect, test } from 'bun:test';

import { upstreamVersionsRule } from '@/scripts/manifest-linter/rules/repository/upstream-versions';
import { checkRule, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

async function checkWithUpstream(status: number | Error) {
	const original = globalThis.fetch;
	const methods: string[] = [];
	const requests: string[] = [];
	globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
		const request = input instanceof Request ? input : new Request(input.toString(), init);
		requests.push(request.url);
		methods.push(request.method);
		if (status instanceof Error) throw status;
		return new Response(undefined, { status });
	}) as typeof globalThis.fetch;
	try {
		const issues = await checkRule(upstreamVersionsRule, {
			records: [record('version'), record('installer'), record('defaultLocale')],
		});
		return { issues, methods, requests };
	} finally {
		globalThis.fetch = original;
	}
}

test('upstream versions rule warns for a version winget-pkgs already publishes', async () => {
	const { issues, methods, requests } = await checkWithUpstream(200);
	expect(messages(issues)).toEqual(['PackageVersion 1.0 already exists in microsoft/winget-pkgs']);
	expect(issues.at(0)?.level).toBe('warning');
	expect(methods).toEqual(['GET']);
	expect(requests).toEqual([
		'https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/manifests/a/Acme/App/1.0/Acme.App.yaml',
	]);
});

test('upstream versions rule accepts new versions and an unreachable upstream', async () => {
	expect((await checkWithUpstream(404)).issues).toEqual([]);
	expect((await checkWithUpstream(new Error('offline'))).issues).toEqual([]);
});

test('upstream versions rule hedges a slow CDN request', async () => {
	const original = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
		const request = input instanceof Request ? input : new Request(input.toString(), init);
		requests.push(request.url);
		if (request.url.startsWith('https://cdn.jsdelivr.net/')) {
			return new Promise((_, reject) => {
				request.signal.addEventListener('abort', () => reject(request.signal.reason), {
					once: true,
				});
			});
		}
		return Promise.resolve(new Response(undefined, { status: 200 }));
	}) as typeof globalThis.fetch;
	try {
		const issues = await checkRule(upstreamVersionsRule, { records: [record('version')] });
		expect(messages(issues)).toEqual([
			'PackageVersion 1.0 already exists in microsoft/winget-pkgs',
		]);
		expect(requests).toEqual([
			'https://cdn.jsdelivr.net/gh/microsoft/winget-pkgs@master/manifests/a/Acme/App/1.0/Acme.App.yaml',
			'https://raw.githubusercontent.com/microsoft/winget-pkgs/refs/heads/master/manifests/a/Acme/App/1.0/Acme.App.yaml',
		]);
	} finally {
		globalThis.fetch = original;
	}
});
