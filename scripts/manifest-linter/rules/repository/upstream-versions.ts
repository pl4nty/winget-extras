import { setTimeout as sleep } from 'node:timers/promises';

import ky from 'ky';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const UPSTREAM_REPOSITORY = 'microsoft/winget-pkgs';
const HEDGE_DELAY_MS = 100;
const upstreamRequest = ky.create({
	retry: 0,
	throwHttpErrors: false,
	timeout: 10_000,
});

function upstreamDirectory(identifier: string, version: string): string {
	return ['manifests', identifier.slice(0, 1).toLowerCase(), ...identifier.split('.'), version]
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

// winget-pkgs is too large to clone and its contents API is rate limited, so
// probe exact version manifests through the jsDelivr mirror the merge workflow uses.
// GET follows the CDN's fast object path; HEAD is substantially slower there. Slow
// cache misses are hedged against GitHub after a short delay, while fast CDN responses
// remain single-request lookups. An unreachable upstream reports nothing.
async function publishedUpstream(identifier: string, version: string): Promise<boolean> {
	const file = `${upstreamDirectory(identifier, version)}/${encodeURIComponent(identifier)}.yaml`;
	const controller = new AbortController();
	async function probe(url: string): Promise<boolean> {
		const response = await upstreamRequest.get(url, { signal: controller.signal });
		await response.body?.cancel();
		return response.status === 200;
	}

	try {
		return await Promise.any([
			probe(`https://cdn.jsdelivr.net/gh/${UPSTREAM_REPOSITORY}@master/${file}`),
			sleep(HEDGE_DELAY_MS, undefined, { signal: controller.signal }).then(() =>
				probe(`https://raw.githubusercontent.com/${UPSTREAM_REPOSITORY}/refs/heads/master/${file}`),
			),
		]);
	} catch {
		return false;
	} finally {
		controller.abort();
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
