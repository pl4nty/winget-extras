import { basename, dirname } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

function shardName(path: string): string {
	return basename(path)
		.replace(/\.[^.]+(\.disabled)?$/, '')
		.toLowerCase();
}

export const shardCoverageRule = defineRule({
	id: 'repository/shard-coverage',
	check({ records, shards, report }) {
		const covered = new Set(shards.map(shardName));
		const packages = new Map<string, string>();
		for (const { root, directory, manifest } of records) {
			const shard =
				root === 'fonts' ? `${manifest.PackageIdentifier}.Font` : manifest.PackageIdentifier;
			if (!packages.has(shard)) packages.set(shard, dirname(directory));
		}

		for (const [shard, directory] of packages) {
			if (covered.has(shard.toLowerCase())) continue;
			report({
				file: directory,
				level: 'warning',
				message: 'package has no shard for automated updates',
				hints: [`add shards/json/${shard}.json or shards/script/${shard}.ts`],
			});
		}
	},
});
