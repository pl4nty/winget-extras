import type { InstallerManifest } from '@/scripts/manifest-linter/manifest-schemas';
import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

// A dotted number such as `616.64`. A bare number is usually part of the name,
// as in `IIS 10 Express`.
const VERSION = /\d+(?:\.\d+)+/g;

// Every DisplayName the manifest writes, at the root and per installer. Nothing
// is resolved or deduplicated: a name written three times gets three
// diagnostics, because a replacement fix rewrites one occurrence.
function displayNames(manifest: InstallerManifest): string[] {
	const entries = [
		...(manifest.AppsAndFeaturesEntries ?? []),
		...manifest.Installers.flatMap((installer) => installer.AppsAndFeaturesEntries ?? []),
	];
	return entries.flatMap((entry) => (entry.DisplayName ? [entry.DisplayName] : []));
}

function key(identifier: string, version: string, name: string): string {
	return JSON.stringify([identifier.toLowerCase(), version, name]);
}

// Komac only reads Apps and Features entries out of installer formats it can
// unpack. For the rest, such as the NVIDIA driver, an update copies the previous
// manifest's entries, so a DisplayName that names its version keeps naming the
// previous one. The copied name is still written by that previous manifest,
// which is how it is told apart from a product number: no other version writes
// `IIS 10.0 Express`.
export const arpDisplayNameVersionRule = defineRule({
	id: 'repository/arp-display-name-version',
	check({ records, report }) {
		const names: { file: string; identifier: string; version: string; name: string }[] = [];
		for (const { file, manifest } of records) {
			if (manifest.ManifestType !== 'installer') continue;
			const { PackageIdentifier: identifier, PackageVersion: version } = manifest;
			for (const name of displayNames(manifest)) names.push({ file, identifier, version, name });
		}
		const writtenBy = new Map(
			names.map((entry) => [key(entry.identifier, entry.version, entry.name), entry.file]),
		);

		for (const { file, identifier, version, name } of names) {
			for (const found of new Set(name.match(VERSION))) {
				if (found === version) continue;
				const origin = writtenBy.get(key(identifier, found, name));
				if (!origin) continue;
				const expected = name.replace(VERSION, (match) => (match === found ? version : match));
				report({
					file,
					level: 'warning',
					message: `DisplayName must be written as: ${expected}`,
					search: name,
					hints: [`copied from ${origin}`],
					fix: { kind: 'replacement', from: name, to: expected },
				});
			}
		}
	},
});
