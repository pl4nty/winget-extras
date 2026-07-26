import { describe, expect, test } from 'bun:test';

import { manifestSetRule } from '@/scripts/manifest-linter/rules/repository/manifest-set';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

describe('manifest set rule', () => {
	test('accepts a complete, consistent manifest set', async () => {
		const issues = await checkRule(manifestSetRule, {
			records: [record('version'), record('installer'), record('defaultLocale')],
		});
		expect(issues).toEqual([]);
	});

	test('validates shared fields and schema versions', async () => {
		const installer = manifest('installer');
		installer.PackageIdentifier = 'acme.App';
		installer.PackageVersion = '2.0';
		installer.ManifestVersion = '1.12.0';
		const issues = await checkRule(manifestSetRule, {
			records: [
				record('version'),
				record('installer', { manifest: installer }),
				record('defaultLocale'),
			],
		});
		expect(messages(issues)).toContain(
			'PackageIdentifier acme.App does not match version manifest Acme.App',
		);
		expect(messages(issues)).toContain('PackageVersion 2.0 does not match version manifest 1.0');
		expect(messages(issues)).toContain(
			'ManifestVersion 1.12.0 does not match version manifest 1.28.0',
		);
	});

	test('requires one member of each required type', async () => {
		const issues = await checkRule(manifestSetRule, {
			records: [
				record('version'),
				record('version'),
				record('installer'),
				record('defaultLocale'),
				record('defaultLocale'),
			],
		});
		expect(messages(issues)).toContain(
			'manifest set must contain exactly one version manifest (found 2)',
		);
		expect(messages(issues)).toContain(
			'manifest set must contain exactly one defaultLocale manifest (found 2)',
		);
	});

	test('validates locale uniqueness and the declared default locale', async () => {
		const version = manifest('version');
		if (version.ManifestType === 'version') version.DefaultLocale = 'fr-FR';
		const issues = await checkRule(manifestSetRule, {
			records: [
				record('version', { manifest: version }),
				record('defaultLocale'),
				record('locale'),
			],
		});
		expect(messages(issues)).toContain(
			'manifest set must contain exactly one installer manifest (found 0)',
		);
		expect(
			messages(issues).some((message) => message.startsWith('PackageLocale en-US duplicates')),
		).toBe(true);
		expect(messages(issues)).toContain(
			'DefaultLocale fr-FR has no corresponding defaultLocale manifest',
		);
	});
});
