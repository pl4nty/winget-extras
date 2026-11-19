import { readFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

// A script shard returns state as a `state: value` property or `state` shorthand
// at the end of a line or object. Passing a `state` variable as an argument does not.
const SCRIPT_STATE = /\bstate\s*(?::|,\s*$|})/m;

async function returnsState(shard: string): Promise<boolean> {
	const contents = await readFile(shard, 'utf8');
	if (shard.endsWith('.json')) return 'state' in JSON.parse(contents);
	return SCRIPT_STATE.test(contents);
}

// Anthelion reads version-state/<PackageIdentifier>, without the `.Font` suffix of font
// shard names, and fails the update when the file is missing.
export const versionStateRule = defineRule({
	id: 'repository/version-state',
	async check({ shards, report }) {
		await Promise.all(
			shards
				.filter((shard) => /\.(json|ts)$/.test(shard))
				.map(async (shard) => {
					const identifier = basename(shard)
						.replace(/\.[^.]+$/, '')
						.replace(/\.Font$/, '');
					const seed = join(dirname(dirname(dirname(shard))), 'version-state', identifier);
					if (!(await returnsState(shard))) return;
					if (await Bun.file(seed).exists()) return;
					report({
						file: shard,
						message: 'shard returns state but has no version-state seed',
						hints: [`add version-state/${identifier} with the state of the merged manifest`],
					});
				}),
		);
	},
});
