import { describe, expect, test } from 'bun:test';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { packageKindRule } from '@/scripts/manifest-linter/rules/repository/package-kind';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

describe('package kind rule', () => {
	test('keeps packages in one root and prevents mixed installer kinds', async () => {
		const fontManifest = {
			...manifest('installer'),
			NestedInstallerType: 'font',
		} as WingetManifest;
		const issues = await checkRule(packageKindRule, {
			records: [
				record('installer'),
				record('installer', { root: 'fonts', manifest: fontManifest }),
			],
		});
		expect(messages(issues)).toContain('package may exist under only one of manifests/ or fonts/');
		expect(messages(issues)).toContain('package may not mix font and application installers');
	});

	test('places font and application installers under their respective roots', async () => {
		const fontManifest = {
			...manifest('installer'),
			NestedInstallerType: 'font',
		} as WingetManifest;
		const issues = await checkRule(packageKindRule, {
			records: [
				record('installer', { manifest: fontManifest }),
				record('installer', { root: 'fonts' }),
			],
		});
		expect(messages(issues)).toContain('font installers must be under fonts/');
		expect(messages(issues)).toContain('application installers must be under manifests/');
	});
});
