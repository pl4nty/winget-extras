import { sep } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import type { ManifestRecord } from '@/scripts/manifest-linter/types';

function displayPath(path: string): string {
	return path.split(sep).join('/');
}

function groupByDirectory(records: ManifestRecord[]): ManifestRecord[][] {
	const sets = new Map<string, ManifestRecord[]>();
	for (const record of records) {
		const members = sets.get(record.directory) ?? [];
		members.push(record);
		sets.set(record.directory, members);
	}
	return [...sets.values()];
}

export const manifestSetRule = defineRule({
	id: 'repository/manifest-set',
	check({ records, report }) {
		for (const members of groupByDirectory(records)) {
			const firstMember = members.at(0);
			if (!firstMember) continue;
			const versionManifests = members.filter(
				(member) => member.manifest.ManifestType === 'version',
			);
			const versionManifest = versionManifests.at(0);
			if (versionManifests.length !== 1) {
				report({
					file: firstMember.directory,
					message: `manifest set must contain exactly one version manifest (found ${versionManifests.length})`,
				});
			}
			const installerManifests = members.filter(
				(member) => member.manifest.ManifestType === 'installer',
			);
			if (installerManifests.length !== 1) {
				report({
					file: firstMember.directory,
					message: `manifest set must contain exactly one installer manifest (found ${installerManifests.length})`,
				});
			}

			if (versionManifest) {
				for (const field of ['PackageIdentifier', 'PackageVersion'] as const) {
					const expected = versionManifest.manifest[field];
					for (const member of members) {
						const actual = member.manifest[field];
						if (actual !== expected) {
							report({
								file: member.file,
								message: `${field} ${actual} does not match version manifest ${expected}`,
								search: field,
							});
						}
					}
				}
			}

			const manifestVersion = versionManifest?.manifest.ManifestVersion;
			if (versionManifests.length === 1 && manifestVersion) {
				for (const member of members) {
					const memberVersion = member.manifest.ManifestVersion;
					if (memberVersion !== manifestVersion) {
						report({
							file: member.file,
							message: `ManifestVersion ${memberVersion} does not match version manifest ${manifestVersion}`,
							search: 'ManifestVersion',
						});
					}
				}
			}

			const defaultLocales = members.filter(
				(member) => member.manifest.ManifestType === 'defaultLocale',
			);
			if (defaultLocales.length !== 1) {
				report({
					file: firstMember.directory,
					message: `manifest set must contain exactly one defaultLocale manifest (found ${defaultLocales.length})`,
				});
			}

			const locales = new Map<string, string>();
			for (const member of members) {
				const localization = member.manifest;
				if (localization.ManifestType !== 'locale' && localization.ManifestType !== 'defaultLocale')
					continue;
				const packageLocale = localization.PackageLocale;
				const previous = locales.get(packageLocale);
				if (previous) {
					report({
						file: member.file,
						message: `PackageLocale ${packageLocale} duplicates ${displayPath(previous)}`,
						search: 'PackageLocale',
					});
				} else locales.set(packageLocale, member.file);
			}

			const versionData = versionManifest?.manifest;
			const defaultLocale =
				versionData?.ManifestType === 'version' ? versionData.DefaultLocale : undefined;
			if (
				versionManifest &&
				defaultLocale &&
				!defaultLocales.some(
					(member) =>
						member.manifest.ManifestType === 'defaultLocale' &&
						member.manifest.PackageLocale === defaultLocale,
				)
			) {
				report({
					file: versionManifest.file,
					message: `DefaultLocale ${defaultLocale} has no corresponding defaultLocale manifest`,
				});
			}
		}
	},
});
