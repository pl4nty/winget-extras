import { readFile } from 'node:fs/promises';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

// Strategies that resolve installer URLs for each new version. Shard `urls` replace them.
const URL_STRATEGIES = new Set([
	'appinstaller',
	'electron-builder',
	'ms-download-center',
	'redirect-match',
	'tauri',
	'todesktop',
]);

type Shard = {
	strategy?: string;
	github?: { method?: string };
	urls?: (string | { url: string })[];
};

function resolvesUrls(shard: Shard): boolean {
	if (shard.strategy === 'github-release')
		return (shard.github?.method ?? 'redirect') !== 'redirect';
	return URL_STRATEGIES.has(shard.strategy ?? '');
}

// A URL without placeholders is fetched as-is, so new versions keep the old installer.
export const shardUrlsRule = defineRule({
	id: 'repository/shard-urls',
	async check({ shards, report }) {
		await Promise.all(
			shards
				.filter((shard) => shard.endsWith('.json'))
				.map(async (file) => {
					const shard: Shard = JSON.parse(await readFile(file, 'utf8'));
					if (!resolvesUrls(shard)) return;
					const literal = (shard.urls ?? [])
						.map((entry) => (typeof entry === 'string' ? entry : entry.url))
						.filter((url) => /^https?:\/\//.test(url) && !url.includes('{'));
					if (literal.length === 0) return;
					report({
						file,
						message: `shard replaces the ${shard.strategy} strategy URLs with literal URLs`,
						hints: [
							'remove urls and filter files with the strategy options, or template them from strategy data',
						],
					});
				}),
		);
	},
});
