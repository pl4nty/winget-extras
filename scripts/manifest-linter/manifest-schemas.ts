import { isDeepStrictEqual } from 'node:util';

import { z } from 'zod';

/* oxlint-disable no-control-regex -- WinGet names exclude ASCII control characters. */
const PACKAGE_IDENTIFIER =
	/^[^.\s\\/:*?"<>|\x01-\x1f]{1,32}(\.[^.\s\\/:*?"<>|\x01-\x1f]{1,32}){1,7}$/;
const PACKAGE_VERSION = /^[^\\/:*?"<>|\x01-\x1f]+$/;
const LOCALE = /^([a-zA-Z]{2,3}|[iI]-[a-zA-Z]+|[xX]-[a-zA-Z]{1,8})(-[a-zA-Z]{1,8})*$/;
const VERSION =
	/^(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])(\.(0|[1-9][0-9]{0,3}|[1-5][0-9]{4}|6[0-4][0-9]{3}|65[0-4][0-9]{2}|655[0-2][0-9]|6553[0-5])){0,3}$/;
const URL = /^https?:\/\/.+$/i;
const FILE_NAME = /^[^\\/:*?"<>|\x01-\x1f]+$/;
/* oxlint-enable no-control-regex */
const APPROXIMATE_VERSION = /^\s*[<>] /;

const nonApproximateVersion = <Schema extends z.ZodString>(schema: Schema) =>
	schema.refine((value) => !APPROXIMATE_VERSION.test(value), 'must not be approximate');
const uniqueArray = <Element extends z.ZodType>(element: Element) =>
	z
		.array(element)
		.refine((values) => new Set(values).size === values.length, 'must not contain duplicate items');
const deeplyUniqueArray = <Element extends z.ZodType>(element: Element) =>
	z
		.array(element)
		.refine(
			(values) =>
				values.every(
					(value, index) =>
						values.findIndex((candidate) => isDeepStrictEqual(candidate, value)) === index,
				),
			'must not contain duplicate items',
		);

export const SUPPORTED_MANIFEST_VERSIONS = ['1.9.0', '1.10.0', '1.12.0', '1.28.0'] as const;

const PackageIdentifierSchema = z.string().max(128).regex(PACKAGE_IDENTIFIER);
const PackageVersionSchema = z.string().max(128).regex(PACKAGE_VERSION);
const ExactPackageVersionSchema = nonApproximateVersion(PackageVersionSchema);
const LocaleSchema = z.string().max(20).regex(LOCALE);
const UrlSchema = z.string().max(2048).regex(URL);
const manifestIdentityShape = {
	PackageIdentifier: PackageIdentifierSchema,
	PackageVersion: PackageVersionSchema,
};

const PackageFamilyNameSchema = z
	.string()
	.max(255)
	.regex(/^[A-Za-z0-9][-.A-Za-z0-9]+_[A-Za-z0-9]{13}$/)
	.optional();
const ProductCodeSchema = z.string().min(1).max(255).optional();
const InstallerReturnCodeSchema = z
	.number()
	.int()
	.min(-2_147_483_648)
	.max(4_294_967_295)
	.refine((value) => value !== 0, 'must not be zero');
const normalizedInstallerReturnCode = (value: number) =>
	value < 0 ? value + 0x1_0000_0000 : value;
const installerSwitchSchema = (maximum: number) =>
	z
		.string()
		.min(1)
		.max(maximum)
		.refine((value) => !value.includes('\\\\'), 'must not contain a UNC path')
		.optional();

const InstallerSwitchesSchema = z.strictObject({
	Silent: installerSwitchSchema(512),
	SilentWithProgress: installerSwitchSchema(512),
	Interactive: installerSwitchSchema(512),
	InstallLocation: installerSwitchSchema(512),
	Log: installerSwitchSchema(512),
	Upgrade: installerSwitchSchema(512),
	Custom: installerSwitchSchema(2048),
	Repair: installerSwitchSchema(512),
});

const ReturnResponseSchema = z.enum([
	'packageInUse',
	'packageInUseByApplication',
	'installInProgress',
	'fileInUse',
	'missingDependency',
	'diskFull',
	'insufficientMemory',
	'invalidParameter',
	'noNetwork',
	'contactSupport',
	'rebootRequiredToFinish',
	'rebootRequiredForInstall',
	'rebootInitiated',
	'cancelledByUser',
	'alreadyInstalled',
	'downgrade',
	'blockedByPolicy',
	'systemNotSupported',
	'custom',
]);

const ExpectedReturnCodesSchema = z
	.array(
		z.strictObject({
			InstallerReturnCode: InstallerReturnCodeSchema,
			ReturnResponse: ReturnResponseSchema,
			ReturnResponseUrl: UrlSchema.optional(),
		}),
	)
	.max(128)
	.optional();

const DependenciesSchema = z
	.strictObject({
		WindowsFeatures: uniqueArray(
			z
				.string()
				.min(1)
				.max(128)
				.regex(/^[A-Za-z0-9_-]+$/),
		)
			.max(16)
			.optional(),
		WindowsLibraries: uniqueArray(z.string().min(1).max(128)).max(16).optional(),
		PackageDependencies: deeplyUniqueArray(
			z.strictObject({
				PackageIdentifier: PackageIdentifierSchema,
				MinimumVersion: PackageVersionSchema.optional(),
			}),
		)
			.max(16)
			.optional(),
		ExternalDependencies: uniqueArray(z.string().min(1).max(128)).max(16).optional(),
	})
	.optional();

const MarketListSchema = uniqueArray(z.string().regex(/^[A-Z]{2}$/)).max(256);
const MarketsSchema = z.union([
	z.strictObject({ AllowedMarkets: MarketListSchema }),
	z.strictObject({ ExcludedMarkets: MarketListSchema }),
]);

const InstallationMetadataSchema = z.strictObject({
	DefaultInstallLocation: z.string().min(1).max(2048).optional(),
	Files: deeplyUniqueArray(
		z.strictObject({
			RelativeFilePath: z.string().min(1).max(2048),
			FileSha256: z.hash('sha256').optional(),
			FileType: z.enum(['launch', 'uninstall', 'other']).optional(),
			InvocationParameter: z.string().min(1).max(2048).optional(),
			DisplayName: z.string().min(1).max(256).optional(),
		}),
	)
		.max(2048)
		.optional(),
});

const AuthenticationSchema = z
	.strictObject({
		AuthenticationType: z.literal('none'),
		MicrosoftEntraIdAuthenticationInfo: z
			.strictObject({
				Resource: z.string().min(1).max(512).optional(),
				Scope: z.string().min(1).max(512).optional(),
			})
			.optional(),
	})
	.optional();

const DesiredStateConfigurationSchema = z
	.strictObject({
		PowerShell: z
			.array(
				z.strictObject({
					RepositoryUrl: UrlSchema,
					ModuleName: z
						.string()
						.max(100)
						.regex(/^\w+([.-]\w+)*$/),
					Resources: z
						.array(
							z.strictObject({
								Name: z
									.string()
									.max(100)
									.regex(/^[A-Za-z][-_A-Za-z0-9]*$/)
									.optional(),
							}),
						)
						.max(64),
				}),
			)
			.max(0)
			.optional(),
		DSCv3: z
			.strictObject({
				Resources: z
					.array(
						z.strictObject({
							Type: z
								.string()
								.max(256)
								.regex(/^\w+(\.\w+){0,2}\/\w+$/)
								.optional(),
						}),
					)
					.max(128),
			})
			.optional(),
	})
	.optional();

const InstallerTypeSchema = z.enum([
	'msix',
	'msi',
	'appx',
	'exe',
	'zip',
	'inno',
	'nullsoft',
	'wix',
	'burn',
	'pwa',
	'portable',
	'font',
]);
const NestedInstallerTypeSchema = InstallerTypeSchema.exclude(['zip', 'pwa']);
const InstallerArchitectureSchema = z.enum(['x86', 'x64', 'arm', 'arm64', 'neutral']);
const ArchitectureSchema = InstallerArchitectureSchema.exclude(['neutral']);

const installerFeatures = {
	'1.9.0': { authentication: false, dsc: false, font: false },
	'1.10.0': { authentication: true, dsc: false, font: false },
	'1.12.0': { authentication: true, dsc: false, font: true },
	'1.28.0': { authentication: true, dsc: true, font: true },
} satisfies Record<
	(typeof SUPPORTED_MANIFEST_VERSIONS)[number],
	{ authentication: boolean; dsc: boolean; font: boolean }
>;

const installerShape = {
	InstallerLocale: LocaleSchema.optional(),
	Platform: uniqueArray(z.enum(['Windows.Desktop', 'Windows.Universal']))
		.max(2)
		.optional(),
	MinimumOSVersion: z.string().regex(VERSION).optional(),
	InstallerType: InstallerTypeSchema.optional(),
	NestedInstallerType: NestedInstallerTypeSchema.optional(),
	NestedInstallerFiles: z
		.array(
			z.strictObject({
				RelativeFilePath: z.string().min(1).max(512),
				PortableCommandAlias: z.string().min(1).max(40).optional(),
			}),
		)
		.max(1024)
		.optional(),
	Scope: z.enum(['user', 'machine']).optional(),
	InstallModes: uniqueArray(z.enum(['interactive', 'silent', 'silentWithProgress']))
		.max(3)
		.optional(),
	InstallerSwitches: InstallerSwitchesSchema.optional(),
	InstallerSuccessCodes: uniqueArray(InstallerReturnCodeSchema).max(16).optional(),
	ExpectedReturnCodes: ExpectedReturnCodesSchema,
	UpgradeBehavior: z.enum(['install', 'uninstallPrevious', 'deny']).optional(),
	Commands: uniqueArray(z.string().min(1).max(40)).max(16).optional(),
	Protocols: uniqueArray(z.string().max(2048)).max(64).optional(),
	FileExtensions: uniqueArray(z.string().max(64).regex(FILE_NAME)).max(512).optional(),
	Dependencies: DependenciesSchema,
	PackageFamilyName: PackageFamilyNameSchema,
	ProductCode: ProductCodeSchema,
	Capabilities: uniqueArray(z.string().min(1).max(40)).max(1000).optional(),
	RestrictedCapabilities: uniqueArray(z.string().min(1).max(40)).max(1000).optional(),
	Markets: MarketsSchema.optional(),
	InstallerAbortsTerminal: z.boolean().optional(),
	ReleaseDate: z.iso.date().optional(),
	InstallLocationRequired: z.boolean().optional(),
	RequireExplicitUpgrade: z.boolean().optional(),
	DisplayInstallWarnings: z.boolean().optional(),
	UnsupportedOSArchitectures: uniqueArray(ArchitectureSchema).optional(),
	UnsupportedArguments: uniqueArray(z.enum(['log', 'location'])).optional(),
	AppsAndFeaturesEntries: deeplyUniqueArray(
		z.strictObject({
			DisplayName: z.string().min(1).max(256).optional(),
			Publisher: z.string().min(1).max(256).optional(),
			DisplayVersion: nonApproximateVersion(z.string().min(1).max(128)).optional(),
			ProductCode: ProductCodeSchema,
			UpgradeCode: ProductCodeSchema,
			InstallerType: InstallerTypeSchema.optional(),
		}),
	)
		.max(128)
		.optional(),
	ElevationRequirement: z
		.enum(['elevationRequired', 'elevationProhibited', 'elevatesSelf'])
		.optional(),
	InstallationMetadata: InstallationMetadataSchema.optional(),
	DownloadCommandProhibited: z.boolean().optional(),
	RepairBehavior: z.enum(['modify', 'uninstaller', 'installer']).optional(),
	ArchiveBinariesDependOnPath: z.boolean().optional(),
	Authentication: AuthenticationSchema,
	DesiredStateConfiguration: DesiredStateConfigurationSchema,
};
const InstallerSchema = z.strictObject({
	...installerShape,
	Architecture: InstallerArchitectureSchema,
	InstallerUrl: UrlSchema,
	InstallerSha256: z.hash('sha256'),
	SignatureSha256: z.hash('sha256').optional(),
});
export const InstallerManifestSchema = z.compile(
	z
		.strictObject({
			...manifestIdentityShape,
			PackageVersion: ExactPackageVersionSchema,
			...installerShape,
			Installers: z.array(InstallerSchema).min(1).max(1024),
			ManifestType: z.literal('installer'),
			ManifestVersion: z.enum(SUPPORTED_MANIFEST_VERSIONS),
		})
		.superRefine((manifest, context) => {
			if (manifest.InstallerType === undefined) {
				for (const [index, installer] of manifest.Installers.entries()) {
					if (installer.InstallerType !== undefined) continue;
					context.addIssue({
						code: 'custom',
						message: 'Invalid input: expected installer type, received undefined',
						path: ['Installers', index, 'InstallerType'],
					});
				}
			}

			for (const [index, installer] of manifest.Installers.entries()) {
				const returnCodes = new Set(
					(installer.InstallerSuccessCodes ?? manifest.InstallerSuccessCodes ?? []).map(
						normalizedInstallerReturnCode,
					),
				);
				for (const expected of installer.ExpectedReturnCodes ??
					manifest.ExpectedReturnCodes ??
					[]) {
					const normalized = normalizedInstallerReturnCode(expected.InstallerReturnCode);
					if (returnCodes.has(normalized)) {
						context.addIssue({
							code: 'custom',
							message: 'duplicate installer return code',
							path:
								installer.ExpectedReturnCodes == null
									? ['ExpectedReturnCodes']
									: ['Installers', index, 'ExpectedReturnCodes'],
						});
					} else returnCodes.add(normalized);
				}
			}

			const features = installerFeatures[manifest.ManifestVersion];
			const scopes = [
				{ installer: manifest, path: [] as (string | number)[] },
				...manifest.Installers.map((installer, index) => ({
					installer,
					path: ['Installers', index] as (string | number)[],
				})),
			];

			for (const { installer, path } of scopes) {
				if (!features.authentication && installer.Authentication !== undefined) {
					context.addIssue({
						code: 'custom',
						message: `Authentication is not supported by manifest ${manifest.ManifestVersion}`,
						path: [...path, 'Authentication'],
					});
				}
				if (!features.dsc && installer.DesiredStateConfiguration !== undefined) {
					context.addIssue({
						code: 'custom',
						message: `DesiredStateConfiguration is not supported by manifest ${manifest.ManifestVersion}`,
						path: [...path, 'DesiredStateConfiguration'],
					});
				}
				if (features.font) continue;

				for (const property of ['InstallerType', 'NestedInstallerType'] as const) {
					if (installer[property] !== 'font') continue;
					context.addIssue({
						code: 'custom',
						message: `font installers are not supported by manifest ${manifest.ManifestVersion}`,
						path: [...path, property],
					});
				}
				for (const [index, entry] of (installer.AppsAndFeaturesEntries ?? []).entries()) {
					if (entry.InstallerType !== 'font') continue;
					context.addIssue({
						code: 'custom',
						message: `font installers are not supported by manifest ${manifest.ManifestVersion}`,
						path: [...path, 'AppsAndFeaturesEntries', index, 'InstallerType'],
					});
				}
			}
		}),
	{ strict: true },
);

const TagSchema = z.string().min(1).max(40);
const PublisherSchema = z.string().min(2).max(256);
const PackageNameSchema = z.string().min(2).max(256);
const LicenseSchema = z.string().min(3).max(512);
const ShortDescriptionSchema = z.string().min(3).max(256);
const AgreementSchema = z
	.strictObject({
		AgreementLabel: z.string().min(1).max(100).optional(),
		Agreement: z.string().min(1).max(10_000).optional(),
		AgreementUrl: UrlSchema.optional(),
	})
	.refine(
		(agreement) =>
			[agreement.AgreementLabel, agreement.Agreement, agreement.AgreementUrl].some(
				(value) => typeof value === 'string' && /\S/.test(value),
			),
		'agreement must include non-empty content',
	);
const DocumentationSchema = z.strictObject({
	DocumentLabel: z.string().min(1).max(100).optional(),
	DocumentUrl: UrlSchema.optional(),
});
const IconSchema = z.strictObject({
	IconUrl: UrlSchema,
	IconFileType: z.enum(['png', 'jpeg', 'ico']),
	IconResolution: z
		.enum([
			'custom',
			'16x16',
			'20x20',
			'24x24',
			'30x30',
			'32x32',
			'36x36',
			'40x40',
			'48x48',
			'60x60',
			'64x64',
			'72x72',
			'80x80',
			'96x96',
			'256x256',
		])
		.optional(),
	IconTheme: z.enum(['default', 'light', 'dark', 'highContrast']).optional(),
	IconSha256: z.hash('sha256'),
});

const localizationOptionalShape = {
	PublisherUrl: UrlSchema.optional(),
	PublisherSupportUrl: UrlSchema.optional(),
	PrivacyUrl: UrlSchema.optional(),
	Author: z.string().min(2).max(256).optional(),
	PackageUrl: UrlSchema.optional(),
	LicenseUrl: UrlSchema.optional(),
	Copyright: z.string().min(3).max(512).optional(),
	CopyrightUrl: UrlSchema.optional(),
	Description: z.string().min(3).max(10_000).optional(),
	Tags: uniqueArray(TagSchema).max(16).optional(),
	Agreements: z.array(AgreementSchema).max(128).optional(),
	ReleaseNotes: z.string().min(1).max(10_000).optional(),
	ReleaseNotesUrl: UrlSchema.optional(),
	PurchaseUrl: UrlSchema.optional(),
	InstallationNotes: z.string().min(1).max(10_000).optional(),
	Documentations: z.array(DocumentationSchema).max(256).optional(),
	Icons: z.array(IconSchema).max(1024).optional(),
};

const LocaleManifestVariantSchema = z.strictObject({
	...manifestIdentityShape,
	PackageLocale: LocaleSchema,
	Publisher: PublisherSchema.optional(),
	PackageName: PackageNameSchema.optional(),
	License: LicenseSchema.optional(),
	ShortDescription: ShortDescriptionSchema.optional(),
	...localizationOptionalShape,
	ManifestType: z.literal('locale'),
	ManifestVersion: z.enum(SUPPORTED_MANIFEST_VERSIONS),
});

const DefaultLocaleManifestSchema = z.strictObject({
	...manifestIdentityShape,
	PackageLocale: LocaleSchema,
	Publisher: PublisherSchema,
	PackageName: PackageNameSchema,
	License: LicenseSchema,
	ShortDescription: ShortDescriptionSchema,
	Moniker: TagSchema,
	...localizationOptionalShape,
	ManifestType: z.literal('defaultLocale'),
	ManifestVersion: z.enum(SUPPORTED_MANIFEST_VERSIONS),
});

export const LocaleManifestSchema = z.compile(
	z.discriminatedUnion('ManifestType', [LocaleManifestVariantSchema, DefaultLocaleManifestSchema]),
	{ strict: true },
);

export const VersionManifestSchema = z.compile(
	z.strictObject({
		...manifestIdentityShape,
		DefaultLocale: LocaleSchema,
		ManifestType: z.literal('version'),
		ManifestVersion: z.enum(SUPPORTED_MANIFEST_VERSIONS),
	}),
	{ strict: true },
);

export type InstallerManifest = z.infer<typeof InstallerManifestSchema>;
export type LocalizationManifest = z.infer<typeof LocaleManifestSchema>;
export type VersionManifest = z.infer<typeof VersionManifestSchema>;
export type WingetManifest = InstallerManifest | LocalizationManifest | VersionManifest;
