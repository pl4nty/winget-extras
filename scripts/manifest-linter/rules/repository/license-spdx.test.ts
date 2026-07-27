import { describe, expect, test } from 'bun:test';

import { licenseSpdxRule } from '@/scripts/manifest-linter/rules/repository/license-spdx';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

const LICENSES = [
	{ licenseId: 'MIT', isDeprecatedLicenseId: false },
	{ licenseId: 'Apache-2.0', isDeprecatedLicenseId: false },
	{ licenseId: 'GPL-3.0-only', isDeprecatedLicenseId: false },
	{ licenseId: 'Autoconf-exception-3.0', isDeprecatedLicenseId: false },
	{ licenseId: 'GPL-3.0', isDeprecatedLicenseId: true },
];

async function checkLicense(license: string | undefined, response?: Response | Error) {
	const original = globalThis.fetch;
	const requests: string[] = [];
	globalThis.fetch = (async (url: string) => {
		requests.push(url);
		if (response instanceof Error) throw response;
		return response ?? Response.json({ licenses: LICENSES });
	}) as typeof globalThis.fetch;
	try {
		const issues = await checkRule(licenseSpdxRule, {
			records: [
				record('defaultLocale', {
					manifest: { ...manifest('defaultLocale'), License: license } as never,
				}),
			],
		});
		return { issues, requests };
	} finally {
		globalThis.fetch = original;
	}
}

describe('license spdx rule', () => {
	test('accepts published identifiers, expressions and the house values', async () => {
		for (const license of [
			'MIT',
			'MIT OR Apache-2.0',
			'GPL-3.0-only WITH Autoconf-exception-3.0',
			'Proprietary',
			'Freeware',
			'  ',
			undefined,
		]) {
			expect((await checkLicense(license)).issues).toEqual([]);
		}
		expect((await checkLicense('MIT')).requests).toEqual([
			'https://spdx.org/licenses/licenses.json',
		]);
	});

	test('warns for values that are not published identifiers', async () => {
		const { issues } = await checkLicense('Proprietary (Freeware)');
		expect(messages(issues)).toEqual(['License Proprietary (Freeware) is not an SPDX identifier']);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.search).toBe('License');
		expect(issues[0]?.hints).toEqual([
			'use an identifier from https://spdx.org/licenses/, or Proprietary or Freeware for a license SPDX does not list',
		]);

		expect(messages((await checkLicense('GPLv3')).issues)).toEqual([
			'License GPLv3 is not an SPDX identifier',
		]);
		// Only the unknown operand of an expression is reported.
		expect(messages((await checkLicense('MIT OR Nonesuch')).issues)).toEqual([
			'License Nonesuch is not an SPDX identifier',
		]);
	});

	test('points a deprecated identifier at its SPDX page', async () => {
		const { issues } = await checkLicense('GPL-3.0');
		expect(messages(issues)).toEqual(['License GPL-3.0 is a deprecated SPDX identifier']);
		expect(issues[0]?.hints).toEqual([
			'see https://spdx.org/licenses/GPL-3.0.html for its replacement',
		]);
	});

	test('reports nothing without a reachable list or a localization manifest', async () => {
		expect((await checkLicense('GPLv3', new Error('offline'))).issues).toEqual([]);
		expect((await checkLicense('GPLv3', new Response(undefined, { status: 503 }))).issues).toEqual(
			[],
		);
		expect((await checkLicense('GPLv3', Response.json({ licenses: [] }))).issues).toEqual([]);

		const original = globalThis.fetch;
		const requests: string[] = [];
		globalThis.fetch = (async (url: string) => {
			requests.push(url);
			return Response.json({ licenses: LICENSES });
		}) as typeof globalThis.fetch;
		try {
			expect(
				await checkRule(licenseSpdxRule, { records: [record('installer'), record('version')] }),
			).toEqual([]);
		} finally {
			globalThis.fetch = original;
		}
		expect(requests).toEqual([]);
	});
});
