import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import { resolveInstaller } from '@/scripts/manifest-linter/rules/installer/resolution';
import type { ManifestRecord } from '@/scripts/manifest-linter/types';

const INSTALLER = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\//i;
const GITHUB = /^https?:\/\/(?:www\.)?github\.com(?:[/?#]|$)/i;

function installerRepositories(records: ManifestRecord[]): string[] {
	const repositories = new Set<string>();
	for (const { manifest } of records) {
		if (manifest.ManifestType !== 'installer') continue;
		for (const installer of manifest.Installers) {
			const match = INSTALLER.exec(resolveInstaller(manifest, installer).InstallerUrl ?? '');
			if (match) repositories.add(`${match[1]}/${match[2]}`);
		}
	}
	return [...repositories];
}

/**
 * Checks package identity against the owner and repository in GitHub
 * InstallerUrls. GitHub's own download URLs carry canonical casing, so this
 * needs no API calls. Display names in Publisher are left alone, and so are
 * PublisherUrl and PackageUrl when they point at a vendor's own site.
 */
export const githubIdentityRule = defineRule({
	id: 'repository/github-identity',
	check({ records, report }) {
		const directories = Map.groupBy(records, (record) => record.directory);
		for (const group of directories.values()) {
			const repositories = installerRepositories(group);
			if (!repositories.length) continue;
			const owners = [...new Set(repositories.map((repository) => repository.split('/')[0]!))];
			const expected = {
				PublisherUrl: owners.map((owner) => `https://github.com/${owner}`),
				PackageUrl: repositories.map((repository) => `https://github.com/${repository}`),
			};

			// The publisher segment must keep GitHub's casing when it names the owner.
			const installer = group.find(({ manifest }) => manifest.ManifestType === 'installer')!;
			const identifier = installer.manifest.PackageIdentifier;
			const [publisher, ...rest] = identifier.split('.');
			const owner = owners.find((name) => name.toLowerCase() === publisher!.toLowerCase());
			if (owner && owner !== publisher) {
				report({
					file: installer.file,
					level: 'warning',
					message: `PackageIdentifier publisher must match GitHub owner casing: ${[owner, ...rest].join('.')}`,
					search: `PackageIdentifier: ${identifier}`,
				});
			}

			for (const { file, manifest, raw } of group) {
				if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale')
					continue;
				for (const field of ['PublisherUrl', 'PackageUrl'] as const) {
					const value = manifest[field];
					if (!value || !GITHUB.test(value) || expected[field].includes(value)) continue;
					const line = new RegExp(`^${field}:[ \\t]*(['"]?)(.*?)\\1[ \\t]*(?=\\r?$)`, 'm').exec(
						raw,
					);
					const [to] = expected[field];
					report({
						file,
						level: 'warning',
						message: `${field} must match the GitHub InstallerUrl: ${expected[field].join(' or ')}`,
						search: line?.[0] ?? `${field}:`,
						...(line?.[2] === value &&
							expected[field].length === 1 && {
								fix: { kind: 'replacement', from: line[0], to: `${field}: ${to}` },
							}),
					});
				}
			}
		}
	},
});
