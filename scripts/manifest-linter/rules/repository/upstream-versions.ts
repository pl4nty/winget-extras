import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const UPSTREAM_REPOSITORY = 'microsoft/winget-pkgs';

function upstreamDirectory(identifier: string, version: string): string {
	return ['manifests', identifier.slice(0, 1).toLowerCase(), ...identifier.split('.'), version]
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

// winget-pkgs is too large to clone and its contents API is rate limited, so
// versions are probed through the jsDelivr mirror the merge workflow uses.
// An unreachable mirror reports nothing rather than failing the repository.
async function publishedUpstream(identifier: string, version: string): Promise<boolean> {
	const file = `${upstreamDirectory(identifier, version)}/${encodeURIComponent(identifier)}.yaml`;
	try {
		const response = await fetch(
			`https://cdn.jsdelivr.net/gh/${UPSTREAM_REPOSITORY}@master/${file}`,
			{ method: 'HEAD', signal: AbortSignal.timeout(10_000) },
		);
		return response.status === 200;
	} catch {
		return false;
	}
}

export const upstreamVersionsRule = defineRule({
	id: 'repository/upstream-versions',
	check({ records, report }) {
		const pending: Promise<void>[] = [];
		for (const { file, manifest } of records) {
			if (manifest.ManifestType !== 'version') continue;
			const identifier = manifest.PackageIdentifier;
			const version = manifest.PackageVersion;
			pending.push(
				publishedUpstream(identifier, version).then((published) => {
					if (!published) return;
					report({
						file,
						level: 'warning',
						message: `PackageVersion ${version} already exists in ${UPSTREAM_REPOSITORY}`,
						search: 'PackageVersion',
						hints: [
							`prefer the upstream package at https://github.com/${UPSTREAM_REPOSITORY}/tree/master/${upstreamDirectory(identifier, version)}`,
						],
					});
				}),
			);
		}
		if (pending.length) return Promise.all(pending).then(() => undefined);
	},
});
