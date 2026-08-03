import { describe, expect, test } from 'bun:test';

import { copyrightFormatRule } from '@/scripts/manifest-linter/rules/repository/copyright-format';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

function checkCopyright(copyright: string | undefined, raw?: string) {
	return checkRule(copyrightFormatRule, {
		records: [
			record('defaultLocale', {
				manifest: { ...manifest('defaultLocale'), Copyright: copyright } as never,
				raw: raw ?? `Copyright: ${copyright}\n`,
			}),
		],
	});
}

describe('copyright format rule', () => {
	test('accepts notices already written as © <year> <holder>', async () => {
		for (const copyright of [
			'© 2014 Ryan L McIntyre.',
			'© 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
			'© 2011-2026 NVIDIA Corporation',
			'© Microsoft Corporation. All rights reserved.',
			'© 2009, 2010, 2013 André Berg',
			'© 2026 Begonia Holdings. © 2026 Purslane Ltd.',
			'Artem Izmaylov',
			'Digitized data copyright (c) 2012-2015, The Mozilla Foundation and Telefonica S.A.',
			undefined,
		]) {
			expect(await checkCopyright(copyright)).toEqual([]);
		}
	});

	test('rewrites the notice marker and the comma after the year', async () => {
		const issues = await checkCopyright(
			'Copyright (c) 2014, Ryan L McIntyre (https://ryanlmcintyre.com).',
		);
		expect(messages(issues)).toEqual([
			'Copyright must be written as: © 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
		]);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.search).toBe(
			'Copyright (c) 2014, Ryan L McIntyre (https://ryanlmcintyre.com).',
		);
		expect(issues[0]?.fix).toEqual({
			kind: 'replacement',
			from: 'Copyright (c) 2014, Ryan L McIntyre (https://ryanlmcintyre.com).',
			to: '© 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
		});
	});

	test('collapses every spelling of the marker to the bare symbol', async () => {
		const expected = async (copyright: string) => (await checkCopyright(copyright)).at(0)?.message;
		expect(await expected('Copyright © 2017 IBM Corp.')).toBe(
			'Copyright must be written as: © 2017 IBM Corp.',
		);
		expect(await expected('Copyright (C) Microsoft Corporation. All rights reserved.')).toBe(
			'Copyright must be written as: © Microsoft Corporation. All rights reserved.',
		);
		expect(await expected('(c) 2013-2021, type agaric <agaric@protonmail.com>')).toBe(
			'Copyright must be written as: © 2013-2021 type agaric <agaric@protonmail.com>',
		);
		expect(await expected('Copyright 2021 Huawei Device Co., Ltd.')).toBe(
			'Copyright must be written as: © 2021 Huawei Device Co., Ltd.',
		);
		expect(await expected('Copyright (c), The Ubuntu Font Family Project Authors')).toBe(
			'Copyright must be written as: © The Ubuntu Font Family Project Authors',
		);
		expect(await expected('Copyright (c) AVerMedia')).toBe(
			'Copyright must be written as: © AVerMedia',
		);
	});

	test('separates the year from the holder without splitting a year list', async () => {
		const expected = async (copyright: string) => (await checkCopyright(copyright)).at(0)?.message;
		// The comma of a year list separates two years rather than the holder.
		expect(await checkCopyright('© 2009, 2010, 2013 André Berg')).toEqual([]);
		expect(await expected('Copyright © 2019 - Present, Microsoft Corporation')).toBe(
			'Copyright must be written as: © 2019 - Present Microsoft Corporation',
		);
		expect(await expected('Copyright (c) 2019-07-29, Abbie Gonzalez')).toBe(
			'Copyright must be written as: © 2019-07-29 Abbie Gonzalez',
		);
		expect(await expected('Copyright (c) 2022--2024, atelierAnchor')).toBe(
			'Copyright must be written as: © 2022--2024 atelierAnchor',
		);
		// A holder that opens with a digit is still a holder.
		expect(await expected('Copyright (c) 2024, 0xType Project Authors')).toBe(
			'Copyright must be written as: © 2024 0xType Project Authors',
		);
	});

	test('reports each notice of a semicolon separated Copyright separately', async () => {
		const issues = await checkCopyright(
			'Copyright (c) 2018 Information Architects Inc.; Copyright (c) 2017 IBM Corp.',
		);
		expect(messages(issues)).toEqual([
			'Copyright must be written as: © 2018 Information Architects Inc.',
			'Copyright must be written as: © 2017 IBM Corp.',
		]);
	});

	test('reports each notice of a multi-line Copyright separately', async () => {
		const raw = [
			'Copyright: |-',
			'  Copyright (c) 2018 Information Architects Inc.',
			'  Work in the DejaVu project was committed to the public domain.',
			'  Copyright (c) 2017 IBM Corp.',
			'',
		].join('\n');
		const issues = await checkCopyright(
			'Copyright (c) 2018 Information Architects Inc.\nWork in the DejaVu project was committed to the public domain.\nCopyright (c) 2017 IBM Corp.',
			raw,
		);
		expect(messages(issues)).toEqual([
			'Copyright must be written as: © 2018 Information Architects Inc.',
			'Copyright must be written as: © 2017 IBM Corp.',
		]);
		expect(issues.map((issue) => issue.fix)).toEqual([
			{
				kind: 'replacement',
				from: 'Copyright (c) 2018 Information Architects Inc.',
				to: '© 2018 Information Architects Inc.',
			},
			{
				kind: 'replacement',
				from: 'Copyright (c) 2017 IBM Corp.',
				to: '© 2017 IBM Corp.',
			},
		]);
	});

	test('reports without a fix when the notice is not unique in the file', async () => {
		const copyright = 'Copyright (c) AVerMedia';
		const issues = await checkCopyright(
			copyright,
			`Copyright: ${copyright}\nShortDescription: Copyright (c) AVerMedia devices\n`,
		);
		expect(messages(issues)).toEqual(['Copyright must be written as: © AVerMedia']);
		expect(issues[0]?.fix).toBeUndefined();
	});

	test('reports nothing for manifests without a locale', async () => {
		expect(
			await checkRule(copyrightFormatRule, {
				records: [record('installer'), record('version')],
			}),
		).toEqual([]);
	});
});
