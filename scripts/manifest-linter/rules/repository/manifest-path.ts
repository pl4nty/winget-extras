import { basename, join, sep } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

function displayPath(path: string): string {
	return path.split(sep).join('/');
}

export const manifestPathRule = defineRule({
	id: 'repository/manifest-path',
	check({ records, report }) {
		for (const { file, root, directory, manifest } of records) {
			const identifier = manifest.PackageIdentifier;
			const version = manifest.PackageVersion;
			const type = manifest.ManifestType;
			const locale =
				type === 'locale' || type === 'defaultLocale' ? manifest.PackageLocale : undefined;
			const expectedDirectory = join(
				root,
				identifier.slice(0, 1).toLowerCase(),
				...identifier.split('.'),
				version,
			);
			const hints: string[] = [];
			let search: string | undefined;
			if (directory !== expectedDirectory) {
				search = basename(directory) === version ? 'PackageIdentifier' : 'PackageVersion';
				hints.push(`move the manifest to ${displayPath(expectedDirectory)}`);
			}

			let expectedName: string;
			if (type === 'installer') expectedName = `${identifier}.installer.yaml`;
			else if (type === 'version') expectedName = `${identifier}.yaml`;
			else expectedName = `${identifier}.locale.${locale}.yaml`;
			if (file !== join(directory, expectedName)) {
				const localeSuffix =
					type === 'locale' || type === 'defaultLocale'
						? `.locale.${String(locale)}.yaml`
						: undefined;
				search ??=
					localeSuffix && !basename(file).endsWith(localeSuffix)
						? 'PackageLocale'
						: 'PackageIdentifier';
				hints.push(`rename the file to ${expectedName}`);
			}

			if (search) {
				report({
					file,
					message: `manifest path does not match ${search}`,
					search,
					hints,
				});
			}
		}
	},
});
