import { describe, expect, test } from 'bun:test';

import { copyrightFormatRule } from '@/scripts/manifest-linter/rules/repository/copyright-format';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

function checkCopyright(copyright: string | undefined) {
	return checkRule(copyrightFormatRule, {
		records: [
			record('defaultLocale', {
				manifest: { ...manifest('defaultLocale'), Copyright: copyright } as never,
			}),
		],
	});
}

async function expected(copyright: string) {
	return (await checkCopyright(copyright)).at(0)?.message;
}

describe('copyright format rule', () => {
	test('accepts a notice already written as © <year> <holder>.', async () => {
		for (const copyright of [
			'© 2014 Ryan L McIntyre.',
			'© 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
			'© 2009, 2010, 2013 André Berg.',
			'© Microsoft Corporation. All rights reserved.',
			'Artem Izmaylov',
			undefined,
		]) {
			expect(await checkCopyright(copyright)).toEqual([]);
		}
		expect(
			await checkRule(copyrightFormatRule, { records: [record('installer'), record('version')] }),
		).toEqual([]);
	});

	test('collapses every spelling of the marker and closes the notice', async () => {
		const issues = await checkCopyright(
			'Copyright (c) 2014, Ryan L McIntyre (https://ryanlmcintyre.com).',
		);
		expect(messages(issues)).toEqual([
			'Copyright must be written as: © 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
		]);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.fix).toEqual({
			kind: 'replacement',
			from: 'Copyright (c) 2014, Ryan L McIntyre (https://ryanlmcintyre.com).',
			to: '© 2014 Ryan L McIntyre (https://ryanlmcintyre.com).',
		});

		expect(await expected('Copyright © 2017 IBM Corp.')).toBe(
			'Copyright must be written as: © 2017 IBM Corp.',
		);
		expect(await expected('(c) 2013-2021, type agaric')).toBe(
			'Copyright must be written as: © 2013-2021 type agaric.',
		);
		expect(await expected('Copyright (c), The Ubuntu Font Family Project Authors')).toBe(
			'Copyright must be written as: © The Ubuntu Font Family Project Authors.',
		);
		expect(await expected('© 2011-2026 NVIDIA Corporation ')).toBe(
			'Copyright must be written as: © 2011-2026 NVIDIA Corporation.',
		);
		// A notice qualified before the marker keeps what the qualifier says.
		expect(await expected('Digitized data copyright (c) 2012-2015, The Mozilla Foundation')).toBe(
			'Copyright must be written as: Digitized data © 2012-2015 The Mozilla Foundation.',
		);
	});

	test('separates the year from the holder without splitting a year list', async () => {
		expect(await expected('Copyright 2009, 2010, 2013 André Berg')).toBe(
			'Copyright must be written as: © 2009, 2010, 2013 André Berg.',
		);
		expect(await expected('Copyright © 2019 - Present, Microsoft Corporation')).toBe(
			'Copyright must be written as: © 2019 - Present Microsoft Corporation.',
		);
		expect(await expected('Copyright (c) 2019-07-29, Abbie Gonzalez')).toBe(
			'Copyright must be written as: © 2019-07-29 Abbie Gonzalez.',
		);
		// A holder that opens with a digit is still a holder.
		expect(await expected('Copyright (c) 2024, 0xType Project Authors')).toBe(
			'Copyright must be written as: © 2024 0xType Project Authors.',
		);
	});

	test('reports each notice of a multi-notice Copyright separately', async () => {
		expect(
			messages(
				await checkCopyright(
					'Copyright (c) 2018 Information Architects Inc.; Copyright (c) 2017 IBM Corp.',
				),
			),
		).toEqual([
			'Copyright must be written as: © 2018 Information Architects Inc.',
			'Copyright must be written as: © 2017 IBM Corp.',
		]);

		// A line carrying no marker is left alone.
		expect(
			messages(
				await checkCopyright(
					'Copyright (c) 2018 Source Foundry Authors\nWork in the DejaVu project was committed to the public domain.',
				),
			),
		).toEqual(['Copyright must be written as: © 2018 Source Foundry Authors.']);
	});
});
