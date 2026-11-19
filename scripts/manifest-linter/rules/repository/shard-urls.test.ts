import { describe, expect, test } from 'bun:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { shardUrlsRule } from '@/scripts/manifest-linter/rules/repository/shard-urls';
import { checkRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

async function checkShards(shards: Record<string, object>) {
	const root = await mkdtemp(join(tmpdir(), 'shard-urls-'));
	await Promise.all(
		Object.entries(shards).map(([name, shard]) =>
			writeFile(join(root, name), JSON.stringify(shard)),
		),
	);
	return checkRule(shardUrlsRule, {
		shards: Object.keys(shards).map((name) => join(root, name)),
	});
}

const url = 'https://download.microsoft.com/download/1234/App_1-0.exe';

describe('shard urls rule', () => {
	test('reports literal URLs that replace strategy URLs', async () => {
		const issues = await checkShards({
			'Acme.Download.json': {
				strategy: 'ms-download-center',
				msDownloadCenter: { id: 1 },
				urls: [url],
			},
			'Acme.Redirect.json': { strategy: 'redirect-match', urls: [{ url, architecture: 'x64' }] },
			'Acme.Api.json': {
				strategy: 'github-release',
				github: { method: 'api-latest' },
				urls: [url],
			},
		});
		expect(messages(issues).toSorted((a, b) => a.localeCompare(b))).toEqual([
			'shard replaces the github-release strategy URLs with literal URLs',
			'shard replaces the ms-download-center strategy URLs with literal URLs',
			'shard replaces the redirect-match strategy URLs with literal URLs',
		]);
	});

	test('accepts strategy, templated, and data path URLs', async () => {
		const issues = await checkShards({
			'Acme.Download.json': { strategy: 'ms-download-center', msDownloadCenter: { id: 1 } },
			'Acme.Template.json': {
				strategy: 'ms-download-center',
				urls: ['https://example.com/App_{version}.exe'],
			},
			'Acme.Data.json': {
				strategy: 'tauri',
				urls: ['platforms.windows-x86_64.url'],
			},
			'Acme.Redirect.json': { strategy: 'github-release', github: {}, urls: [url] },
			'Acme.Page.json': { strategy: 'page-match', urls: [url] },
		});
		expect(issues).toHaveLength(0);
	});
});
