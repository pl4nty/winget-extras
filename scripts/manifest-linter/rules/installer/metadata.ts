import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';
import {
	APPS_AND_FEATURES_TYPES,
	appsAndFeaturesUsePackageFamilyName,
	effectiveInstallerType,
	normalizedInstallerType,
	PRODUCT_CODE_TYPES,
	supportsPackageFamilyName,
} from '@/scripts/manifest-linter/rules/installer/resolution';

export const installerMetadataRule = defineInstallerRule({
	id: 'installer/metadata',
	check({ installers, report }) {
		let duplicateReported = false;
		const urlHashes = new Map<string, string>();
		const hashUrls = new Map<string, string>();

		for (const [index, installer] of installers.entries()) {
			const effectiveType = effectiveInstallerType(installer);
			if (!duplicateReported) {
				for (let previousIndex = 0; previousIndex < index; previousIndex++) {
					const previous = installers[previousIndex]!;
					const sameType =
						normalizedInstallerType(previous.InstallerType) ===
							normalizedInstallerType(installer.InstallerType) &&
						(previous.InstallerType !== 'zip' ||
							normalizedInstallerType(previous.NestedInstallerType) ===
								normalizedInstallerType(installer.NestedInstallerType));
					const scopesOverlap =
						previous.Scope === installer.Scope || previous.Scope == null || installer.Scope == null;
					if (
						sameType &&
						previous.Architecture === installer.Architecture &&
						previous.InstallerLocale === installer.InstallerLocale &&
						scopesOverlap
					) {
						report({ message: 'duplicate installer entry', search: 'Installers' });
						duplicateReported = true;
						break;
					}
				}
			}

			if (
				installer.PackageFamilyName &&
				!supportsPackageFamilyName(effectiveType) &&
				!appsAndFeaturesUsePackageFamilyName(installer.AppsAndFeaturesEntries)
			) {
				report({
					message: `PackageFamilyName is unusual for InstallerType ${String(effectiveType)}`,
					search: 'PackageFamilyName',
					level: 'warning',
				});
			}
			if (installer.ProductCode && !PRODUCT_CODE_TYPES.has(String(effectiveType))) {
				report({
					message: `ProductCode is not supported for InstallerType ${String(effectiveType)}`,
					search: 'ProductCode',
				});
			}
			if (
				installer.AppsAndFeaturesEntries.length > 0 &&
				!APPS_AND_FEATURES_TYPES.has(String(effectiveType))
			) {
				report({
					message: `AppsAndFeaturesEntries is not supported for InstallerType ${String(effectiveType)}`,
					search: 'AppsAndFeaturesEntries',
				});
			}

			if (!installer.InstallerUrl || !installer.InstallerSha256) continue;
			const hash = installer.InstallerSha256.toLowerCase();
			const previousHash = urlHashes.get(installer.InstallerUrl);
			if (previousHash && previousHash !== hash) {
				report({
					message: 'the same InstallerUrl is associated with different InstallerSha256 values',
					search: 'InstallerUrl',
				});
			} else urlHashes.set(installer.InstallerUrl, hash);

			const previousUrl = hashUrls.get(hash);
			if (previousUrl && previousUrl !== installer.InstallerUrl) {
				report({
					message: 'the same InstallerSha256 is used by different InstallerUrl values',
					search: 'InstallerSha256',
					level: 'warning',
				});
			} else hashUrls.set(hash, installer.InstallerUrl);
		}
	},
});
