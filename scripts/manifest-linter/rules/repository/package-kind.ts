import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import type { Root } from '@/scripts/manifest-linter/types';

export const packageKindRule = defineRule({
	id: 'repository/package-kind',
	check({ records, report }) {
		const packageRoots = new Map<string, Set<Root>>();
		const packageFiles = new Map<string, string>();
		const packageKinds = new Map<string, Set<'font' | 'application'>>();

		for (const { file, root, manifest } of records) {
			const key = manifest.PackageIdentifier.toLowerCase();
			if (!packageFiles.has(key)) packageFiles.set(key, file);
			const roots = packageRoots.get(key) ?? new Set<Root>();
			roots.add(root);
			packageRoots.set(key, roots);

			if (manifest.ManifestType !== 'installer') continue;
			const installerTypes = [
				manifest.InstallerType,
				manifest.NestedInstallerType,
				...manifest.Installers.flatMap((installer) => [
					installer.InstallerType,
					installer.NestedInstallerType,
				]),
			];
			const kind = installerTypes.includes('font') ? 'font' : 'application';
			const kinds = packageKinds.get(key) ?? new Set<'font' | 'application'>();
			kinds.add(kind);
			packageKinds.set(key, kinds);
			if (kind === 'font' && root !== 'fonts') {
				report({ file, message: 'font installers must be under fonts/' });
			}
			if (kind === 'application' && root !== 'manifests') {
				report({ file, message: 'application installers must be under manifests/' });
			}
		}

		for (const [identifier, roots] of packageRoots) {
			const file = packageFiles.get(identifier);
			if (roots.size > 1 && file) {
				report({ file, message: 'package may exist under only one of manifests/ or fonts/' });
			}
		}
		for (const [identifier, kinds] of packageKinds) {
			const file = packageFiles.get(identifier);
			if (kinds.size > 1 && file) {
				report({ file, message: 'package may not mix font and application installers' });
			}
		}
	},
});
