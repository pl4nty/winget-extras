import { basename, dirname } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

/** Font shards carry this suffix, which is not part of the package identifier. */
const FONT_SUFFIX = '.Font';
/** A parked shard keeps its coverage, so automation can be paused per package. */
const DISABLED_SUFFIX = '.disabled';

/** `shards/json/Acme.App.json` and `shards/script/Acme.App.ts` both cover `Acme.App`. */
function shardKey(path: string): string {
	const file = basename(path);
	const name = file.endsWith(DISABLED_SUFFIX) ? file.slice(0, -DISABLED_SUFFIX.length) : file;
	const extension = name.lastIndexOf('.');
	return (extension > 0 ? name.slice(0, extension) : name).toLowerCase();
}

export const shardCoverageRule = defineRule({
	id: 'repository/shard-coverage',
	check({ records, shards, report }) {
		const covered = new Set(shards.map(shardKey));
		const packages = new Map<string, { shard: string; directory: string }>();

		for (const { root, directory, manifest } of records) {
			const identifier = manifest.PackageIdentifier;
			const shard = root === 'fonts' ? `${identifier}${FONT_SUFFIX}` : identifier;
			const packageDirectory = dirname(directory);
			const previous = packages.get(shard.toLowerCase());
			// Versions share a package directory; the first one keeps reporting stable.
			if (!previous || packageDirectory < previous.directory) {
				packages.set(shard.toLowerCase(), { shard, directory: packageDirectory });
			}
		}

		for (const [key, { shard, directory }] of packages) {
			if (covered.has(key)) continue;
			report({
				file: directory,
				level: 'warning',
				message: 'package has no shard for automated updates',
				hints: [`add shards/json/${shard}.json or shards/script/${shard}.ts`],
			});
		}
	},
});
