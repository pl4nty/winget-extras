import type { InstallerManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import type { InstallerEntry, ResolvedInstaller } from '@/scripts/manifest-linter/rules/helpers';

export const PRODUCT_CODE_TYPES = new Set([
	'exe',
	'inno',
	'msi',
	'nullsoft',
	'wix',
	'burn',
	'portable',
]);
export const APPS_AND_FEATURES_TYPES = PRODUCT_CODE_TYPES;

function withoutNull<T extends object>(value: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(value).filter(([, item]) => item !== null),
	) as Partial<T>;
}

function hasAnyDependency(dependencies: ResolvedInstaller | null | undefined): boolean {
	return !!dependencies && Object.values(dependencies).some((items) => items?.length);
}

export function normalizedInstallerType(installerType: any): any {
	return installerType === 'appx' ? 'msix' : installerType;
}

export function supportsPackageFamilyName(installerType: any): boolean {
	return normalizedInstallerType(installerType) === 'msix';
}

export function appsAndFeaturesUsePackageFamilyName(entries: ResolvedInstaller[]): boolean {
	return entries.some((entry) => normalizedInstallerType(entry.InstallerType) === 'msix');
}

export function resolveInstaller(
	root: InstallerManifest,
	installer: InstallerEntry,
): ResolvedInstaller {
	const resolved: ResolvedInstaller = { ...root, ...withoutNull(installer) };
	resolved.InstallerSwitches = {
		...root.InstallerSwitches,
		...withoutNull(installer.InstallerSwitches ?? {}),
	};

	const baseType = resolved.InstallerType;
	if (baseType === 'zip') {
		resolved.NestedInstallerType = installer.NestedInstallerType ?? root.NestedInstallerType;
		resolved.NestedInstallerFiles = installer.NestedInstallerFiles?.length
			? installer.NestedInstallerFiles
			: root.NestedInstallerFiles;
	} else {
		delete resolved.NestedInstallerType;
		if (installer.NestedInstallerFiles === undefined) delete resolved.NestedInstallerFiles;
	}

	const effectiveType = baseType === 'zip' ? resolved.NestedInstallerType : baseType;
	const installerAppsAndFeatures = installer.AppsAndFeaturesEntries ?? [];
	const rootAppsAndFeatures = root.AppsAndFeaturesEntries ?? [];
	const appsAndFeatures =
		installerAppsAndFeatures.length > 0
			? installerAppsAndFeatures
			: APPS_AND_FEATURES_TYPES.has(String(effectiveType))
				? rootAppsAndFeatures
				: [];
	resolved.AppsAndFeaturesEntries = appsAndFeatures;

	if (installer.PackageFamilyName) {
		resolved.PackageFamilyName = installer.PackageFamilyName;
	} else if (
		supportsPackageFamilyName(effectiveType) ||
		appsAndFeaturesUsePackageFamilyName(appsAndFeatures)
	) {
		resolved.PackageFamilyName = root.PackageFamilyName;
	} else {
		delete resolved.PackageFamilyName;
	}

	if (installer.ProductCode) {
		resolved.ProductCode = installer.ProductCode;
	} else if (PRODUCT_CODE_TYPES.has(String(effectiveType))) {
		resolved.ProductCode = root.ProductCode;
	} else {
		delete resolved.ProductCode;
	}

	resolved.Dependencies = hasAnyDependency(installer.Dependencies)
		? installer.Dependencies
		: root.Dependencies;
	return resolved;
}

export function effectiveInstallerType(installer: ResolvedInstaller): any {
	return normalizedInstallerType(
		installer.InstallerType === 'zip' ? installer.NestedInstallerType : installer.InstallerType,
	);
}
