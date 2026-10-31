import { Database } from 'bun:sqlite';

import { unzipSync } from 'fflate';
import ky from 'ky';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import {
	compareVersions,
	parseVersion,
} from '@/scripts/manifest-linter/rules/repository/arp-version-ranges';

const UPSTREAM_REPOSITORY = 'microsoft/winget-pkgs';
const UPSTREAM_SOURCE = 'https://cdn.winget.microsoft.com/cache/source2.msix';
const INDEX_PATH = 'Public/index.db';

function upstreamDirectory(identifier: string, version: string): string {
	return ['manifests', identifier.slice(0, 1).toLowerCase(), ...identifier.split('.'), version]
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

// The winget community source index lists each package's latest version, so one
// download covers every package. Only each package's latest version here is compared,
// since older pinned versions stay useful while ours is ahead. An unreachable upstream
// reports nothing.
async function upstreamLatestVersions(): Promise<Map<string, { id: string; version: string }>> {
	const latest = new Map<string, { id: string; version: string }>();
	try {
		const source = new Uint8Array(
			await ky.get(UPSTREAM_SOURCE, { retry: 2, timeout: 60_000 }).arrayBuffer(),
		);
		const index = unzipSync(source, { filter: (file) => file.name === INDEX_PATH })[INDEX_PATH];
		if (!index) return latest;
		const database = Database.deserialize(index, { readonly: true });
		try {
			const rows = database
				.query<{ id: string; latest_version: string }, []>(
					'SELECT id, latest_version FROM packages',
				)
				.all();
			for (const { id, latest_version } of rows) {
				latest.set(id.toLocaleLowerCase('en-US'), { id, version: latest_version });
			}
		} finally {
			database.close();
		}
	} catch {}
	return latest;
}

export const upstreamVersionsRule = defineRule({
	id: 'repository/upstream-versions',
	async check({ records, report }) {
		const packages = new Map<string, { file: string; version: string }>();
		for (const { file, manifest } of records) {
			if (manifest.ManifestType !== 'version') continue;
			const identifier = manifest.PackageIdentifier.toLocaleLowerCase('en-US');
			const current = packages.get(identifier);
			const version = manifest.PackageVersion;
			if (current && compareVersions(parseVersion(current.version), parseVersion(version)) >= 0)
				continue;
			packages.set(identifier, { file, version });
		}
		if (!packages.size) return;

		const upstream = await upstreamLatestVersions();
		for (const [identifier, { file, version }] of packages) {
			const latest = upstream.get(identifier);
			if (!latest) continue;
			const comparison = compareVersions(parseVersion(latest.version), parseVersion(version));
			if (comparison < 0) continue;
			report({
				file,
				level: 'warning',
				message:
					comparison === 0
						? `PackageVersion ${version} already exists in ${UPSTREAM_REPOSITORY}`
						: `${UPSTREAM_REPOSITORY} has newer version ${latest.version} than PackageVersion ${version}`,
				search: 'PackageVersion',
				hints: [
					`prefer the upstream package at https://github.com/${UPSTREAM_REPOSITORY}/tree/master/${upstreamDirectory(latest.id, latest.version)}`,
				],
			});
		}
	},
});
