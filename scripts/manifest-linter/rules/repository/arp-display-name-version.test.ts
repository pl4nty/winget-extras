import { describe, expect, test } from 'bun:test';

import { arpDisplayNameVersionRule } from '@/scripts/manifest-linter/rules/repository/arp-display-name-version';
import {
	checkRule,
	installerManifest,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

function installerRecord(version: string, displayNames: string[], identifier = 'Acme.App') {
	return record('installer', {
		directory: `manifests/a/Acme/App/${version}`,
		file: `manifests/a/Acme/App/${version}/${identifier}.installer.yaml`,
		manifest: installerManifest({
			PackageIdentifier: identifier,
			PackageVersion: version,
			InstallerType: 'exe',
			Installers: displayNames.map((DisplayName) => ({
				Architecture: 'x64',
				AppsAndFeaturesEntries: [{ DisplayName }],
			})),
		}),
	});
}

describe('ARP display name version rule', () => {
	test('accepts a name holding its own version', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [installerRecord('1.0', ['Acme App 1.0']), installerRecord('1.1', ['Acme App 1.1'])],
		});
		expect(issues).toEqual([]);
	});

	test('accepts a product number', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [
				installerRecord('10.0.2001.0', ['IIS 10.0 Express']),
				installerRecord('10.0.2002.0', ['IIS 10.0 Express']),
			],
		});
		expect(issues).toEqual([]);
	});

	test('rejects a name copied from an earlier version', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [installerRecord('1.0', ['Acme App 1.0']), installerRecord('1.1', ['Acme App 1.0'])],
		});
		expect(messages(issues)).toEqual(['DisplayName must be written as: Acme App 1.1']);
		expect(issues[0]).toMatchObject({
			level: 'warning',
			search: 'Acme App 1.0',
			hints: ['copied from manifests/a/Acme/App/1.0/Acme.App.installer.yaml'],
			fix: { kind: 'replacement', from: 'Acme App 1.0', to: 'Acme App 1.1' },
		});
	});

	test('reports each occurrence of a repeated name', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [
				installerRecord('1.0', ['Acme App 1.0']),
				installerRecord('1.1', ['Acme App 1.0', 'Acme App 1.0', 'Acme App 1.0']),
			],
		});
		expect(messages(issues)).toHaveLength(3);
	});

	test('reads a root entry once', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [
				installerRecord('1.0', ['Acme App 1.0']),
				record('installer', {
					manifest: installerManifest({
						PackageVersion: '1.1',
						InstallerType: 'exe',
						AppsAndFeaturesEntries: [{ DisplayName: 'Acme App 1.0' }],
						Installers: [{ Architecture: 'x64' }, { Architecture: 'x86' }],
					}),
				}),
			],
		});
		expect(messages(issues)).toHaveLength(1);
	});

	test('accepts a name no other version of the package wrote', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [
				installerRecord('1.1', ['Acme App 1.0']),
				installerRecord('1.0', ['Acme 1.0']),
				installerRecord('1.0', ['Acme App 1.0'], 'Acme.Other'),
			],
		});
		expect(issues).toEqual([]);
	});

	test('ignores manifests without Apps and Features entries', async () => {
		const issues = await checkRule(arpDisplayNameVersionRule, {
			records: [record('defaultLocale'), record('version'), installerRecord('1.0', [])],
		});
		expect(issues).toEqual([]);
	});
});
