import { describe, expect, test } from 'bun:test';

import type { ValidateFunction } from 'ajv';

import { getSchemaValidator } from '@/scripts/manifest-linter/schema';

type ManifestInput = Record<string, any>;

function validator(type: string, version: string): ValidateFunction {
	const validate = getSchemaValidator(type, version);
	if (!validate) throw new Error(`missing generated validator for ${version}/${type}`);
	return validate;
}

describe('generated installer schemas', () => {
	for (const version of ['1.9.0', '1.10.0', '1.12.0', '1.28.0']) {
		const validate = validator('installer', version);
		const installer = (values: ManifestInput = {}) => ({
			PackageIdentifier: 'Example.Package',
			PackageVersion: '1.0.0',
			Installers: [
				{
					Architecture: 'x64',
					InstallerType: 'exe',
					InstallerUrl: 'https://example.test/setup.exe',
					InstallerSha256: 'A'.repeat(64),
				},
			],
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
			]) {
				expect(validate(installer(invalid))).toBe(false);
			}
			expect(
				validate(installer({ InstallerSwitches: { Custom: 'INSTALLDIR=C:\\Program Files' } })),
			).toBe(true);
		});

		test(`installer ${version} requires a root or per-installer type`, () => {
			const untyped = {
				Architecture: 'x64',
				InstallerUrl: 'https://example.test/setup.exe',
				InstallerSha256: 'A'.repeat(64),
			};
			expect(validate(installer({ Installers: [untyped] }))).toBe(false);
			expect(validate(installer({ InstallerType: 'exe', Installers: [untyped] }))).toBe(true);
		});

		if (version !== '1.9.0') {
			test(`installer ${version} rejects authentication`, () => {
				expect(
					validate(installer({ Authentication: { AuthenticationType: 'microsoftEntraId' } })),
				).toBe(false);
			});
		}

		if (version === '1.28.0') {
			test('installer 1.28.0 rejects DSC PowerShell resources', () => {
				expect(
					validate(
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
					),
				).toBe(false);
			});
		}
	}
});

describe('generated localization schemas', () => {
	for (const version of ['1.9.0', '1.10.0', '1.12.0', '1.28.0']) {
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
					expect(validate(localization(agreement))).toBe(false);
				}
			});

			test(`${type} ${version} accepts any non-empty agreement field`, () => {
				for (const agreement of [
					{ AgreementLabel: 'Terms' },
					{ Agreement: 'Terms' },
					{ AgreementUrl: 'https://example.test/terms' },
				]) {
					expect(validate(localization(agreement))).toBe(true);
				}
			});
		}
	}
});
