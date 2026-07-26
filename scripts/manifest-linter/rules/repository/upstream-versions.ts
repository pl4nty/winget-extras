import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const UPSTREAM_REPOSITORY = 'microsoft/winget-pkgs';

function upstreamDirectory(identifier: string, version: string): string {
	return ['manifests', identifier.slice(0, 1).toLowerCase(), ...identifier.split('.'), version]
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

/**
 * This source exists for packages winget-pkgs does not carry, so a version it
 * already publishes is redundant here. winget-pkgs is too large to clone and its
 * contents API is rate limited, so each version manifest is probed through the
 * jsDelivr mirror the merge workflow uses.
 */
export const upstreamVersionsRule = defineRule({
	id: 'repository/upstream-versions',
	async check({ records, report }) {
		await Promise.all(
			records
				.filter((record) => record.manifest.ManifestType === 'version')
				.map(async ({ file, manifest }) => {
					const directory = upstreamDirectory(manifest.PackageIdentifier, manifest.PackageVersion);
					const response = await fetch(
						`https://cdn.jsdelivr.net/gh/${UPSTREAM_REPOSITORY}@master/${directory}/${encodeURIComponent(manifest.PackageIdentifier)}.yaml`,
						{ method: 'HEAD', signal: AbortSignal.timeout(10_000) },
					).catch(() => undefined);
					// Anything but a definite 200 means the version is new or upstream is
					// unreachable, neither of which is a violation.
					if (response?.status !== 200) return;
					report({
						file,
						level: 'warning',
						message: `${manifest.PackageIdentifier} ${manifest.PackageVersion} already exists in ${UPSTREAM_REPOSITORY}`,
						search: 'PackageVersion',
						hints: [`https://github.com/${UPSTREAM_REPOSITORY}/tree/master/${directory}`],
					});
				}),
		);
	},
});
