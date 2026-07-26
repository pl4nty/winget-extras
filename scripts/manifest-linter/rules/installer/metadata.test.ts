import { describe, expect, test } from 'bun:test';

import { installerMetadataRule } from '@/scripts/manifest-linter/rules/installer/metadata';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer metadata rule', () => {
	test('detects duplicate installers and conflicting URL hashes', async () => {
		const issues = await checkInstallerRule(installerMetadataRule, {
			InstallerType: 'msi',
			Installers: [
				{
					Architecture: 'x64',
					InstallerUrl: 'https://example.test/setup.msi',
					InstallerSha256: 'A'.repeat(64),
				},
				{
					Architecture: 'x64',
					Scope: 'machine',
					InstallerUrl: 'https://example.test/setup.msi',
					InstallerSha256: 'B'.repeat(64),
				},
			],
		});
		expect(messages(issues)).toContain('duplicate installer entry');
		expect(messages(issues)).toContain(
			'the same InstallerUrl is associated with different InstallerSha256 values',
		);
	});

	test('warns when one hash is reused for different URLs', async () => {
		const issues = await checkInstallerRule(installerMetadataRule, {
			InstallerType: 'msi',
			Installers: [
				{
					Architecture: 'x64',
					InstallerUrl: 'https://example.test/x64.msi',
					InstallerSha256: 'A'.repeat(64),
				},
				{
					Architecture: 'arm64',
					InstallerUrl: 'https://example.test/arm64.msi',
					InstallerSha256: 'A'.repeat(64),
				},
			],
		});
		const issue = issues.find(
			(issue) =>
				issue.message === 'the same InstallerSha256 is used by different InstallerUrl values',
		);
		expect(issue?.level).toBe('warning');
	});

	test('validates installer identity metadata', async () => {
		const issues = await checkInstallerRule(installerMetadataRule, {
			Installers: [
				{
					Architecture: 'x64',
					InstallerType: 'exe',
					PackageFamilyName: 'Example_123',
				},
				{
					Architecture: 'arm64',
					InstallerType: 'msix',
					ProductCode: '{PRODUCT}',
					AppsAndFeaturesEntries: [{ DisplayName: 'Example' }],
				},
			],
		});
		expect(messages(issues)).toContain('PackageFamilyName is unusual for InstallerType exe');
		expect(messages(issues)).toContain('ProductCode is not supported for InstallerType msix');
		expect(messages(issues)).toContain(
			'AppsAndFeaturesEntries is not supported for InstallerType msix',
		);
	});
});
