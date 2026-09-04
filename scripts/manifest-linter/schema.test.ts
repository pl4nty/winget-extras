import { describe, expect, test } from 'bun:test';

import { getSchemaValidator } from '@/scripts/manifest-linter/schema';
import type { ManifestSchema } from '@/scripts/manifest-linter/schema';

type ManifestInput = Record<string, any>;
const versions = ['1.9.0', '1.10.0', '1.12.0', '1.28.0'] as const;

function validator(type: string, version: string): ManifestSchema {
	const validate = getSchemaValidator(type, version);
	if (!validate) throw new Error(`missing generated validator for ${version}/${type}`);
	return validate;
}

describe('compiled installer schemas', () => {
	for (const version of versions) {
		const validate = validator('installer', version);
		const installerEntry = (values: ManifestInput = {}) => ({
			Architecture: 'x64',
			InstallerType: 'exe',
			InstallerUrl: 'https://example.test/setup.exe',
			InstallerSha256: 'A'.repeat(64),
			...values,
		});
		const installer = (values: ManifestInput = {}) => ({
			PackageIdentifier: 'Example.Package',
			PackageVersion: '1.0.0',
			Installers: [installerEntry()],
			ManifestType: 'installer',
			ManifestVersion: version,
			...values,
		});

		test(`installer ${version} enforces simple policy constraints`, () => {
			for (const invalid of [
				{ Channel: 'preview' },
				{ PackageVersion: '< 2.0.0' },
				{ AppsAndFeaturesEntries: [{ DisplayVersion: '> 2.0.0' }] },
				{ Dependencies: { WindowsFeatures: ['MediaPlayback /LogPath:C:\\file.txt'] } },
				{ InstallerSwitches: { Custom: '\\\\server\\share' } },
				{ InstallerSuccessCodes: [0] },
			]) {
				expect(validate.safeParse(installer(invalid)).success).toBe(false);
			}
			expect(
				validate.safeParse(
					installer({ InstallerSwitches: { Custom: 'INSTALLDIR=C:\\Program Files' } }),
				).success,
			).toBe(true);
		});

		test(`installer ${version} rejects duplicate items in unique arrays`, () => {
			const duplicatePackageDependency = [
				{ PackageIdentifier: 'Example.Dependency', MinimumVersion: '1.0.0' },
				{ MinimumVersion: '1.0.0', PackageIdentifier: 'Example.Dependency' },
			];
			const duplicateArpEntry = [{ DisplayName: 'Example' }, { DisplayName: 'Example' }];
			const duplicateInstalledFile = [
				{ RelativeFilePath: 'example.exe' },
				{ RelativeFilePath: 'example.exe' },
			];
			for (const invalid of [
				{ Platform: ['Windows.Desktop', 'Windows.Desktop'] },
				{ InstallModes: ['silent', 'silent'] },
				{ InstallerSuccessCodes: [1, 1] },
				{ Commands: ['example', 'example'] },
				{ Protocols: ['example', 'example'] },
				{ FileExtensions: ['example', 'example'] },
				{ Dependencies: { WindowsFeatures: ['MediaPlayback', 'MediaPlayback'] } },
				{ Dependencies: { WindowsLibraries: ['Example', 'Example'] } },
				{ Dependencies: { PackageDependencies: duplicatePackageDependency } },
				{ Dependencies: { ExternalDependencies: ['Example', 'Example'] } },
				{ Capabilities: ['internetClient', 'internetClient'] },
				{ RestrictedCapabilities: ['runFullTrust', 'runFullTrust'] },
				{ Markets: { AllowedMarkets: ['US', 'US'] } },
				{ Markets: { ExcludedMarkets: ['US', 'US'] } },
				{ UnsupportedOSArchitectures: ['arm', 'arm'] },
				{ UnsupportedArguments: ['log', 'log'] },
				{ AppsAndFeaturesEntries: duplicateArpEntry },
				{ InstallationMetadata: { Files: duplicateInstalledFile } },
			]) {
				expect(validate.safeParse(installer(invalid)).success).toBe(false);
			}
		});

		test(`installer ${version} rejects duplicate normalized return codes`, () => {
			const expectedReturnCodes = [
				{ InstallerReturnCode: 4_294_967_295, ReturnResponse: 'custom' },
			];
			for (const invalid of [
				{
					InstallerSuccessCodes: [-1],
					ExpectedReturnCodes: expectedReturnCodes,
				},
				{
					InstallerSuccessCodes: [-1],
					Installers: [installerEntry({ ExpectedReturnCodes: expectedReturnCodes })],
				},
				{
					ExpectedReturnCodes: expectedReturnCodes,
					Installers: [installerEntry({ InstallerSuccessCodes: [-1] })],
				},
				{
					Installers: [
						installerEntry({
							ExpectedReturnCodes: [
								{ InstallerReturnCode: -1, ReturnResponse: 'custom' },
								...expectedReturnCodes,
							],
						}),
					],
				},
			]) {
				expect(validate.safeParse(installer(invalid)).success).toBe(false);
			}
			for (const valid of [
				{
					InstallerSuccessCodes: [-1],
					ExpectedReturnCodes: expectedReturnCodes,
					Installers: [installerEntry({ ExpectedReturnCodes: [] })],
				},
				{
					InstallerSuccessCodes: [-1],
					ExpectedReturnCodes: expectedReturnCodes,
					Installers: [installerEntry({ InstallerSuccessCodes: [] })],
				},
				{
					InstallerSuccessCodes: [-1],
					ExpectedReturnCodes: [{ InstallerReturnCode: 4_294_967_294, ReturnResponse: 'custom' }],
				},
			]) {
				expect(validate.safeParse(installer(valid)).success).toBe(true);
			}
		});

		test(`installer ${version} rejects null optional fields`, () => {
			for (const field of [
				'Channel',
				'InstallerLocale',
				'Platform',
				'MinimumOSVersion',
				'InstallerType',
				'NestedInstallerType',
				'NestedInstallerFiles',
				'Scope',
				'InstallModes',
				'InstallerSwitches',
				'InstallerSuccessCodes',
				'ExpectedReturnCodes',
				'UpgradeBehavior',
				'Commands',
				'Protocols',
				'FileExtensions',
				'Dependencies',
				'PackageFamilyName',
				'ProductCode',
				'Capabilities',
				'RestrictedCapabilities',
				'Markets',
				'InstallerAbortsTerminal',
				'ReleaseDate',
				'InstallLocationRequired',
				'RequireExplicitUpgrade',
				'DisplayInstallWarnings',
				'UnsupportedOSArchitectures',
				'UnsupportedArguments',
				'AppsAndFeaturesEntries',
				'ElevationRequirement',
				'InstallationMetadata',
				'DownloadCommandProhibited',
				'RepairBehavior',
				'ArchiveBinariesDependOnPath',
				'Authentication',
				'DesiredStateConfiguration',
			]) {
				expect(validate.safeParse(installer({ [field]: null })).success, field).toBe(false);
			}

			for (const invalid of [
				{ InstallerSwitches: { Silent: null } },
				{ Dependencies: { WindowsFeatures: null } },
				{ Markets: { AllowedMarkets: null } },
				{ NestedInstallerFiles: [{ RelativeFilePath: 'setup.exe', PortableCommandAlias: null }] },
				{ AppsAndFeaturesEntries: [{ DisplayName: null }] },
				{ InstallationMetadata: { DefaultInstallLocation: null } },
				{
					Authentication: { AuthenticationType: 'none', MicrosoftEntraIdAuthenticationInfo: null },
				},
				{ SignatureSha256: null },
			]) {
				expect(
					validate.safeParse(installer({ Installers: [installerEntry(invalid)] })).success,
				).toBe(false);
			}
		});

		test(`installer ${version} requires a root or per-installer type`, () => {
			const untyped = {
				Architecture: 'x64',
				InstallerUrl: 'https://example.test/setup.exe',
				InstallerSha256: 'A'.repeat(64),
			};
			expect(validate.safeParse(installer({ Installers: [untyped] })).success).toBe(false);
			expect(
				validate.safeParse(installer({ InstallerType: 'exe', Installers: [untyped] })).success,
			).toBe(true);
		});

		test(`installer ${version} enforces its version-specific fields`, () => {
			const authentication = validate.safeParse(
				installer({
					Authentication: { AuthenticationType: 'none' },
					Installers: [installerEntry({ Authentication: { AuthenticationType: 'none' } })],
				}),
			);
			expect(authentication.success).toBe(version !== '1.9.0');
			if (!authentication.success) {
				expect(authentication.error.issues.map((issue) => issue.path.join('.'))).toEqual([
					'Authentication',
					'Installers.0.Authentication',
				]);
			}

			const font = validate.safeParse(
				installer({
					InstallerType: 'font',
					NestedInstallerType: 'font',
					AppsAndFeaturesEntries: [{ InstallerType: 'font' }],
					Installers: [
						installerEntry({
							InstallerType: 'font',
							NestedInstallerType: 'font',
							AppsAndFeaturesEntries: [{ InstallerType: 'font' }],
						}),
					],
				}),
			);
			expect(font.success).toBe(version === '1.12.0' || version === '1.28.0');
			if (!font.success) {
				expect(font.error.issues.map((issue) => issue.path.join('.'))).toEqual([
					'InstallerType',
					'NestedInstallerType',
					'AppsAndFeaturesEntries.0.InstallerType',
					'Installers.0.InstallerType',
					'Installers.0.NestedInstallerType',
					'Installers.0.AppsAndFeaturesEntries.0.InstallerType',
				]);
			}

			const dsc = validate.safeParse(
				installer({
					DesiredStateConfiguration: { DSCv3: { Resources: [] } },
					Installers: [installerEntry({ DesiredStateConfiguration: { DSCv3: { Resources: [] } } })],
				}),
			);
			expect(dsc.success).toBe(version === '1.28.0');
			if (!dsc.success) {
				expect(dsc.error.issues.map((issue) => issue.path.join('.'))).toEqual([
					'DesiredStateConfiguration',
					'Installers.0.DesiredStateConfiguration',
				]);
			}
		});

		if (version !== '1.9.0') {
			test(`installer ${version} rejects authentication`, () => {
				expect(
					validate.safeParse(
						installer({ Authentication: { AuthenticationType: 'microsoftEntraId' } }),
					).success,
				).toBe(false);
			});
		}

		if (version === '1.28.0') {
			test('installer 1.28.0 rejects DSC PowerShell resources', () => {
				expect(
					validate.safeParse(
						installer({
							DesiredStateConfiguration: {
								PowerShell: [
									{
										RepositoryUrl: 'https://example.test/repository',
										ModuleName: 'Example',
										Resources: [],
									},
								],
							},
						}),
					).success,
				).toBe(false);
			});
		}
	}
});

describe('compiled localization schemas', () => {
	for (const version of versions) {
		for (const type of ['locale', 'defaultLocale'] as const) {
			const validate = validator(type, version);
			const localization = (agreement: Record<string, unknown>) => ({
				PackageIdentifier: 'Example.Package',
				PackageVersion: '1.0.0',
				PackageLocale: 'en-US',
				...(type === 'defaultLocale'
					? {
							Publisher: 'Example',
							PackageName: 'Example',
							License: 'MIT',
							ShortDescription: 'Example package',
							Moniker: 'example',
						}
					: {}),
				Agreements: [agreement],
				ManifestType: type,
				ManifestVersion: version,
			});

			test(`${type} ${version} requires agreement content`, () => {
				for (const agreement of [{}, { Agreement: null }, { Agreement: '   ' }]) {
					expect(validate.safeParse(localization(agreement)).success).toBe(false);
				}
			});

			test(`${type} ${version} accepts any non-empty agreement field`, () => {
				for (const agreement of [
					{ AgreementLabel: 'Terms' },
					{ Agreement: 'Terms' },
					{ AgreementUrl: 'https://example.test/terms' },
				]) {
					expect(validate.safeParse(localization(agreement)).success).toBe(true);
				}
			});

			test(`${type} ${version} rejects null optional fields`, () => {
				const valid = localization({ AgreementLabel: 'Terms' });
				for (const field of [
					'Publisher',
					'PublisherUrl',
					'PublisherSupportUrl',
					'PrivacyUrl',
					'Author',
					'PackageName',
					'PackageUrl',
					'License',
					'LicenseUrl',
					'Copyright',
					'CopyrightUrl',
					'ShortDescription',
					'Description',
					'Tags',
					'Agreements',
					'ReleaseNotes',
					'ReleaseNotesUrl',
					'PurchaseUrl',
					'InstallationNotes',
					'Documentations',
					'Icons',
				]) {
					expect(validate.safeParse({ ...valid, [field]: null }).success, field).toBe(false);
				}

				expect(
					validate.safeParse(localization({ AgreementLabel: 'Terms', AgreementUrl: null })).success,
				).toBe(false);
				expect(validate.safeParse({ ...valid, Tags: [null] }).success).toBe(false);
			});

			test(`${type} ${version} rejects duplicate localization tags`, () => {
				expect(
					validate.safeParse({
						...localization({ AgreementLabel: 'Terms' }),
						Tags: ['utility', 'utility'],
					}).success,
				).toBe(false);
			});

			test(`${type} ${version} counts Unicode code points for string bounds`, () => {
				const valid = localization({ AgreementLabel: 'Terms' });
				expect(validate.safeParse({ ...valid, Publisher: '😀' }).success).toBe(false);
				expect(validate.safeParse({ ...valid, PackageName: '😀'.repeat(200) }).success).toBe(true);
				expect(validate.safeParse({ ...valid, PackageName: '😀'.repeat(257) }).success).toBe(false);
			});
		}
	}
});

test('routes manifests through exactly three compiled schemas', () => {
	for (const version of versions) {
		expect(validator('installer', version)).toBe(validator('installer', versions[0]));
		expect(validator('locale', version)).toBe(validator('locale', versions[0]));
		expect(validator('defaultLocale', version)).toBe(validator('locale', versions[0]));
		expect(validator('version', version)).toBe(validator('version', versions[0]));
	}
	expect(getSchemaValidator('installer', '1.11.0')).toBeUndefined();
});

test('supports every declared version-manifest version', () => {
	for (const version of versions) {
		expect(
			validator('version', version).safeParse({
				PackageIdentifier: 'Example.Package',
				PackageVersion: '1.0.0',
				DefaultLocale: 'en-US',
				ManifestType: 'version',
				ManifestVersion: version,
			}).success,
		).toBe(true);
	}
});
