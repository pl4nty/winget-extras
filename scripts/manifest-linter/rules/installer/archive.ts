import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';
import { effectiveInstallerType } from '@/scripts/manifest-linter/rules/installer/resolution';

const ALLOWED_FONT_EXTENSIONS = new Set(['.otf', '.ttf', '.fnt', '.ttc', '.otc']);

function pathEscapesBaseDirectory(value: string): boolean {
	const parts: string[] = [];
	for (const part of value.split(/[\\/]+/)) {
		if (!part || part === '.') continue;
		if (part === '..') {
			if (parts.length === 0 || parts.at(-1) === '..') parts.push(part);
			else parts.pop();
		} else parts.push(part);
	}
	return parts.at(0) === '..';
}

function fileExtension(value: string): string | undefined {
	const name = value.split(/[\\/]/).at(-1) ?? '';
	const dot = name.lastIndexOf('.');
	return dot > 0 ? name.slice(dot).toLowerCase() : undefined;
}

export const archiveRule = defineInstallerRule({
	id: 'installer/archive',
	check({ installers, report }) {
		for (const installer of installers) {
			const effectiveType = effectiveInstallerType(installer);
			const appsAndFeatures = installer.AppsAndFeaturesEntries;
			if (installer.InstallerType === 'portable' && (installer.Commands?.length ?? 0) > 1) {
				report({
					message: 'a portable installer may define at most one command',
					search: 'Commands',
				});
			}
			if (effectiveType === 'portable') {
				if (appsAndFeatures.length > 1) {
					report({
						message: 'a portable installer may define at most one AppsAndFeaturesEntries item',
						search: 'AppsAndFeaturesEntries',
					});
				}
				if (installer.Scope != null) {
					report({
						message: 'Scope is not supported for portable installers',
						search: 'Scope',
						level: 'warning',
					});
				}
			}

			if (installer.InstallerType !== 'zip') continue;
			if (!installer.NestedInstallerType) {
				report({
					message: 'a zip installer requires NestedInstallerType',
					search: 'NestedInstallerType',
				});
			}
			const nestedFiles = installer.NestedInstallerFiles ?? [];
			if (nestedFiles.length === 0) {
				report({
					message: 'a zip installer requires NestedInstallerFiles',
					search: 'NestedInstallerFiles',
				});
			}
			if (
				!['portable', 'font'].includes(String(installer.NestedInstallerType)) &&
				nestedFiles.length > 1
			) {
				report({
					message: 'a non-portable, non-font zip installer may contain only one nested installer',
					search: 'NestedInstallerFiles',
				});
			}

			const fileIdentities = new Set<string>();
			const aliases = new Set<string>();
			for (const nestedFile of nestedFiles) {
				const path = nestedFile.RelativeFilePath.trim();
				const alias = nestedFile.PortableCommandAlias?.trim();
				if (pathEscapesBaseDirectory(path)) {
					report({
						message: 'RelativeFilePath may not escape the archive directory',
						search: 'RelativeFilePath',
					});
				}
				const identity = JSON.stringify([path.toLowerCase(), alias?.toLowerCase()]);
				if (fileIdentities.has(identity)) {
					report({ message: 'duplicate RelativeFilePath', search: 'RelativeFilePath' });
				} else fileIdentities.add(identity);

				if (alias) {
					if (pathEscapesBaseDirectory(alias)) {
						report({
							message: 'PortableCommandAlias may not escape the base directory',
							search: 'PortableCommandAlias',
						});
					}
					const foldedAlias = alias.toLowerCase();
					if (aliases.has(foldedAlias)) {
						report({ message: 'duplicate PortableCommandAlias', search: 'PortableCommandAlias' });
					} else aliases.add(foldedAlias);
				}

				const extension = fileExtension(path);
				if (
					extension &&
					installer.NestedInstallerType === 'font' &&
					!ALLOWED_FONT_EXTENSIONS.has(extension)
				) {
					report({
						message: `nested font file type ${extension} is not supported`,
						search: 'RelativeFilePath',
					});
				}
			}
		}
	},
});
