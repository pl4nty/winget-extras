import { describe, expect, test } from 'bun:test';

import { arpVersionRangesRule } from '@/scripts/manifest-linter/rules/repository/arp-version-ranges';
import {
	checkRule,
	installerManifest,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

function installerRecord(version: string, displayVersions: string[], installerType = 'wix') {
	return record('installer', {
		directory: `manifests/a/Acme/App/${version}`,
		file: `manifests/a/Acme/App/${version}/Acme.App.installer.yaml`,
		manifest: installerManifest({
			PackageVersion: version,
			InstallerType: installerType,
			AppsAndFeaturesEntries: displayVersions.map((DisplayVersion) => ({ DisplayVersion })),
		}),
	});
}

describe('ARP version ranges rule', () => {
	test('matches winget-cli Version comparison tests', async () => {
		const lessThan = [
			['1', '2'],
			['1.0.0', '2.0.0'],
			['0.0.1', '0.0.2'],
			['0.0.1-alpha', '0.0.2-alpha'],
			['0.0.1-beta', '0.0.2-alpha'],
			['13.9.8', '14.1'],
			['1-rc', '1'],
			['1.2-rc', '1.2'],
			['1.0-rc', '1.0'],
			['1.0.0-rc', '1'],
			['22.0.0-rc.1', '22.0.0'],
			['22.0.0-rc.1', '22.0.0.1'],
			['22.0.0-rc.1', '22.0.0.1-rc'],
			['22.0.0-rc.1', '22.0.0-rc.1.1'],
			['22.0.0-rc.1.1', '22.0.0-rc.1.2'],
			['22.0.0-rc.1.2', '22.0.0-rc.2'],
			['v0.0.1', '0.0.2'],
			['v0.0.1', 'v0.0.2'],
			['1.a2', '1.b1'],
			['alpha', 'beta'],
			['1.0', 'latest'],
			['100', 'latest'],
			['943849587389754876.1', 'latest'],
			['unknown', '1.0'],
			['unknown', '1.fork'],
			['unknown', 'latest'],
			['< 1.0', '1.0'],
			['< 1.0', '> 1.0'],
			['1.0', '> 1.0'],
			['0.9', '< 1.0'],
			['> 1.0', '1.1'],
			['< latest', 'latest'],
			['latest', '> latest'],
			['9999', '< latest'],
		] as const;
		for (const [lower, upper] of lessThan) {
			const issues = await checkRule(arpVersionRangesRule, {
				records: [installerRecord('1.0', [lower, upper]), installerRecord('2.0', [lower])],
			});
			expect(messages(issues)[0]).toContain(`overlaps ${lower}-${upper}`);
		}

		const equal = [
			['1.0', '1.0.0'],
			['1.2.00.3', '1.2.0.3'],
			['1.2.003.4', '1.2.3.4'],
			['01.02.03.04', '1.2.3.4'],
			['1.2.03-beta', '1.2.3-beta'],
			['1.0', '1.0 '],
			['1.0', '1. 0'],
			['1.0', '1.0.'],
			['1.0', 'Version 1.0'],
			['foo1', 'bar1'],
			['latest', 'LATEST'],
			['unknown', 'UNKNOWN'],
			['< 1.0', '< 1.0.0'],
			['> 1.0', '> 1.0.0'],
			['1.SS', '1.ß'],
			['1.σ', '1.ς'],
		] as const;
		for (const [left, right] of equal) {
			const issues = await checkRule(arpVersionRangesRule, {
				records: [installerRecord('1.0', [left]), installerRecord('2.0', [right])],
			});
			expect(messages(issues)).toHaveLength(1);
		}
	});

	test('only trims the ASCII whitespace recognized by winget', async () => {
		const asciiWhitespaceIssues = await checkRule(arpVersionRangesRule, {
			records: [installerRecord('1.0', ['1.2']), installerRecord('2.0', ['\t1.\n2\v\f\r'])],
		});
		expect(messages(asciiWhitespaceIssues)).toHaveLength(1);

		const nonAsciiWhitespaceIssues = await checkRule(arpVersionRangesRule, {
			records: [installerRecord('1.0', ['1.2']), installerRecord('2.0', ['1.\u00a02'])],
		});
		expect(nonAsciiWhitespaceIssues).toEqual([]);
	});

	test('rejects inclusive overlaps between package version ranges', async () => {
		const issues = await checkRule(arpVersionRangesRule, {
			records: [
				installerRecord('10.0.10', ['10.0.10.50000', '80.40.55332']),
				installerRecord('10.0.11', ['10.0.11.50000', '80.44.56884']),
			],
		});
		expect(messages(issues)).toEqual([
			'DisplayVersion range 10.0.11.50000-80.44.56884 for PackageVersion 10.0.11 overlaps 10.0.10.50000-80.40.55332 for PackageVersion 10.0.10',
		]);
		expect(issues[0]?.search).toBe('DisplayVersion');
	});

	test('matches winget-cli VersionRange overlap tests', async () => {
		const cases = [
			{ left: ['1.0', '2.0'], right: ['2.0', '3.0'], overlaps: true },
			{ left: ['1.0', '2.0'], right: ['1.0'], overlaps: true },
			{ left: ['1.0', '2.0'], right: ['0.5', '1.5'], overlaps: true },
			{ left: ['1.0', '2.0'], right: ['2.1', '3.0'], overlaps: false },
		];
		for (const { left, right, overlaps } of cases) {
			const issues = await checkRule(arpVersionRangesRule, {
				records: [installerRecord('1.0', left), installerRecord('2.0', right)],
			});
			expect(issues.length > 0).toBe(overlaps);
		}
	});

	test('accepts distinct ranges', async () => {
		const issues = await checkRule(arpVersionRangesRule, {
			records: [installerRecord('1.0', ['1.0', '1.9']), installerRecord('2.0', ['2.0', '2.9'])],
		});
		expect(issues).toEqual([]);
	});

	test('matches winget effective installer type and root inheritance behavior', async () => {
		const issues = await checkRule(arpVersionRangesRule, {
			records: [
				installerRecord('1.0', ['1.0'], 'portable'),
				installerRecord('2.0', ['1.0'], 'portable'),
				installerRecord('3.0', ['3.0'], 'msix'),
				installerRecord('4.0', ['3.0'], 'msix'),
			],
		});
		expect(issues).toEqual([]);
	});

	test('matches winget version comparison rather than semantic versioning', async () => {
		const issues = await checkRule(arpVersionRangesRule, {
			records: [installerRecord('1.0', ['1.9', '1.10']), installerRecord('2.0', ['1.9.5'])],
		});
		expect(messages(issues)).toHaveLength(1);
	});
});
