import { expect, test } from 'bun:test';

import { licenseSpdxRule } from '@/scripts/manifest-linter/rules/repository/license-spdx';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';
import type { ReportedDiagnostic } from '@/scripts/manifest-linter/types';

const LICENSES = [
	{ licenseId: 'MIT', name: 'MIT License' },
	{ licenseId: 'Apache-2.0', name: 'Apache License 2.0' },
	{ licenseId: 'BSD-3-Clause', name: 'BSD 3-Clause "New" or "Revised" License' },
	{ licenseId: 'OFL-1.1', name: 'SIL Open Font License 1.1' },
	{ licenseId: 'GPL-3.0-only', name: 'GNU General Public License v3.0 only' },
	{ licenseId: 'GPL-3.0-or-later', name: 'GNU General Public License v3.0 or later' },
	{ licenseId: 'GPL-3.0', name: 'GNU General Public License v3.0', isDeprecatedLicenseId: true },
	{
		licenseId: 'GPL-3.0+',
		name: 'GNU General Public License v3.0 or later',
		isDeprecatedLicenseId: true,
	},
	{ licenseId: 'BSD-2-Clause-Views', name: 'BSD 2-Clause with views sentence' },
	{
		licenseId: 'BSD-2-Clause-FreeBSD',
		name: 'BSD 2-Clause FreeBSD License',
		isDeprecatedLicenseId: true,
	},
	{ licenseId: 'wxWindows', name: 'wxWindows Library License', isDeprecatedLicenseId: true },
];

async function checkLicense(
	license: string | undefined,
	options: { type?: 'locale' | 'defaultLocale'; response?: Response | Error } = {},
): Promise<ReportedDiagnostic[]> {
	const original = globalThis.fetch;
	globalThis.fetch = (async (url: string) => {
		expect(url).toBe('https://spdx.org/licenses/licenses.json');
		if (options.response instanceof Error) throw options.response;
		return options.response ?? Response.json({ licenseListVersion: '3.28.0', licenses: LICENSES });
	}) as typeof globalThis.fetch;
	try {
		const type = options.type ?? 'defaultLocale';
		return await checkRule(licenseSpdxRule, {
			records: [record(type, { manifest: { ...manifest(type), License: license } as never })],
		});
	} finally {
		globalThis.fetch = original;
	}
}

test('license rule accepts current identifiers and expressions over them', async () => {
	expect(await checkLicense('MIT')).toEqual([]);
	expect(await checkLicense('GPL-3.0-only')).toEqual([]);
	expect(await checkLicense('OFL-1.1 OR MIT')).toEqual([]);
	expect(await checkLicense('MIT AND Apache-2.0')).toEqual([]);
	expect(await checkLicense('LicenseRef-Acme-Eula')).toEqual([]);
});

test('license rule stays silent for custom and unrecognized text', async () => {
	expect(await checkLicense('Proprietary (Freeware)')).toEqual([]);
	expect(await checkLicense('Nmap Public Source License')).toEqual([]);
	expect(await checkLicense('Не указано')).toEqual([]);
	expect(await checkLicense('Copyright (c) Acme Corporation')).toEqual([]);
	expect(await checkLicense('  ')).toEqual([]);
	expect(await checkLicense(undefined)).toEqual([]);
	expect(await checkLicense('GPL-3.0-only WITH Autoconf-exception-3.0')).toEqual([]);
	// An unknown operand inside an expression is more likely custom than a typo.
	expect(await checkLicense('MIT OR Nmap Public Source License')).toEqual([]);
});

test('license rule suggests the identifier for a close variation', async () => {
	const issues = await checkLicense('MIT License');
	expect(messages(issues)).toEqual(['License MIT License looks like the SPDX identifier MIT']);
	expect(issues.at(0)?.level).toBe('warning');
	expect(issues.at(0)?.search).toBe('License:');
	expect(issues.at(0)?.hints).toEqual([
		'use MIT (MIT License), see https://spdx.org/licenses/MIT.html',
	]);

	expect(messages(await checkLicense('Apache 2.0'))).toEqual([
		'License Apache 2.0 looks like the SPDX identifier Apache-2.0',
	]);
	expect(messages(await checkLicense('SIL Open Font License 1.1'))).toEqual([
		'License SIL Open Font License 1.1 looks like the SPDX identifier OFL-1.1',
	]);
	expect(messages(await checkLicense('mit'))).toEqual([
		'License mit looks like the SPDX identifier MIT',
	]);
	expect(messages(await checkLicense('BSD-3'))).toEqual([
		'License BSD-3 looks like the SPDX identifier BSD-3-Clause',
	]);
});

test('license rule replaces deprecated identifiers where SPDX defines a successor', async () => {
	expect(messages(await checkLicense('GPL-3.0'))).toEqual([
		'License GPL-3.0 is a deprecated SPDX identifier',
	]);
	expect((await checkLicense('GPL-3.0')).at(0)?.hints).toEqual([
		'use GPL-3.0-only (GNU General Public License v3.0 only), see https://spdx.org/licenses/GPL-3.0-only.html',
	]);
	expect((await checkLicense('GPL-3.0+')).at(0)?.hints).toEqual([
		'use GPL-3.0-or-later (GNU General Public License v3.0 or later), see https://spdx.org/licenses/GPL-3.0-or-later.html',
	]);
	expect((await checkLicense('BSD-2-Clause-FreeBSD')).at(0)?.hints).toEqual([
		'use BSD-2-Clause-Views (BSD 2-Clause with views sentence), see https://spdx.org/licenses/BSD-2-Clause-Views.html',
	]);
	// GPLv3 is not an identifier at all, so it is reported as a suggestion.
	expect(messages(await checkLicense('GPLv3'))).toEqual([
		'License GPLv3 looks like the SPDX identifier GPL-3.0-only',
	]);
});

test('license rule points at the SPDX page when no successor can be derived', async () => {
	expect(messages(await checkLicense('wxWindows'))).toEqual([
		'License wxWindows is a deprecated SPDX identifier',
	]);
	expect((await checkLicense('wxWindows')).at(0)?.hints).toEqual([
		'see https://spdx.org/licenses/wxWindows.html for its replacement',
	]);
	expect(messages(await checkLicense('wxWindows Library Licence'))).toEqual([
		'License wxWindows Library Licence looks like the deprecated SPDX identifier wxWindows',
	]);
});

test('license rule checks non-default locales too', async () => {
	expect(messages(await checkLicense('MIT License', { type: 'locale' }))).toEqual([
		'License MIT License looks like the SPDX identifier MIT',
	]);
});

test('license rule reports nothing when the SPDX list is unreachable', async () => {
	expect(await checkLicense('MIT License', { response: new Error('offline') })).toEqual([]);
	expect(
		await checkLicense('MIT License', { response: new Response(undefined, { status: 503 }) }),
	).toEqual([]);
	expect(await checkLicense('MIT License', { response: Response.json({ licenses: [] }) })).toEqual(
		[],
	);
});

test('license rule does not fetch the list when no localization manifests are present', async () => {
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
