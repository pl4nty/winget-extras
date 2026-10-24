import { describe, expect, test } from 'bun:test';

import { githubIdentityRule } from '@/scripts/manifest-linter/rules/repository/github-identity';
import {
	checkRule,
	installerManifest,
	manifest,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

const RELEASE = 'https://github.com/acme/app-cli/releases/download/v1.0/app.exe';

function check(
	identifier: string,
	locale: Record<string, string>,
	urls: string[] = [RELEASE],
	raw?: string,
) {
	return checkRule(githubIdentityRule, {
		records: [
			record('installer', {
				manifest: installerManifest({
					PackageIdentifier: identifier,
					Installers: urls.map((InstallerUrl) => ({ Architecture: 'x64', InstallerUrl })),
				}),
			}),
			record('defaultLocale', {
				manifest: {
					...manifest('defaultLocale'),
					PackageIdentifier: identifier,
					...locale,
				} as never,
				raw,
			}),
		],
	});
}

describe('github identity rule', () => {
	test('accepts matching identity and vendor sites', async () => {
		expect(
			await check('acme.App', {
				PublisherUrl: 'https://github.com/acme',
				PackageUrl: 'https://github.com/acme/app-cli',
			}),
		).toEqual([]);
		expect(
			await check('AcmeCorp.App', {
				Publisher: 'Acme Corporation',
				PublisherUrl: 'https://acme.example/',
				PackageUrl: 'https://acme.example/app',
			}),
		).toEqual([]);
		expect(
			await check('Acme.App', { PackageUrl: 'https://github.com/x/y' }, [
				'https://acme.example/app.exe',
			]),
		).toEqual([]);
	});

	test('requires the publisher segment to keep GitHub owner casing', async () => {
		const issues = await check('Acme.App.Preview', {});
		expect(messages(issues)).toEqual([
			'PackageIdentifier publisher must match GitHub owner casing: acme.App.Preview',
		]);
		expect(issues[0]?.search).toBe('PackageIdentifier: Acme.App.Preview');
		expect(issues[0]?.fix).toBeUndefined();
	});

	test('fixes GitHub URLs that do not match the InstallerUrl', async () => {
		const raw =
			"PublisherUrl: https://github.com/acme/app-cli\r\nPackageUrl: 'https://github.com/Acme/app-cli/'\r\n";
		const issues = await check(
			'acme.App',
			{
				PublisherUrl: 'https://github.com/acme/app-cli',
				PackageUrl: 'https://github.com/Acme/app-cli/',
			},
			[RELEASE],
			raw,
		);
		expect(messages(issues)).toEqual([
			'PublisherUrl must match the GitHub InstallerUrl: https://github.com/acme',
			'PackageUrl must match the GitHub InstallerUrl: https://github.com/acme/app-cli',
		]);
		expect(issues.map(({ fix }) => fix)).toEqual([
			{
				kind: 'replacement',
				from: 'PublisherUrl: https://github.com/acme/app-cli',
				to: 'PublisherUrl: https://github.com/acme',
			},
			{
				kind: 'replacement',
				from: "PackageUrl: 'https://github.com/Acme/app-cli/'",
				to: 'PackageUrl: https://github.com/acme/app-cli',
			},
		]);
	});

	test('accepts any repository and reports without a fix when several match', async () => {
		const urls = [RELEASE, 'https://github.com/acme/app-gui/releases/download/v1.0/app.msi'];
		expect(
			await check('acme.App', { PackageUrl: 'https://github.com/acme/app-gui' }, urls),
		).toEqual([]);
		const issues = await check('acme.App', { PackageUrl: 'https://github.com/acme' }, urls);
		expect(messages(issues)).toEqual([
			'PackageUrl must match the GitHub InstallerUrl: https://github.com/acme/app-cli or https://github.com/acme/app-gui',
		]);
		expect(issues[0]?.fix).toBeUndefined();
	});
});
