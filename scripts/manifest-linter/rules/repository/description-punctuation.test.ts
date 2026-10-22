import { describe, expect, test } from 'bun:test';

import { parseYaml } from '@unownplain/anthelion-komac';

import type { WingetManifest } from '@/scripts/manifest-linter/manifest-schemas';
import { descriptionPunctuationRule } from '@/scripts/manifest-linter/rules/repository/description-punctuation';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

const HEADER = 'PackageIdentifier: Acme.App\nPackageVersion: 1.0\nPackageLocale: en-US\n';
const FOOTER = 'ManifestType: defaultLocale\nManifestVersion: 1.28.0\n';

function checkSource(raw: string) {
	return checkRule(descriptionPunctuationRule, {
		records: [record('defaultLocale', { manifest: parseYaml(raw) as WingetManifest, raw })],
	});
}

async function fixed(body: string) {
	let raw = `${HEADER}${body}${FOOTER}`;
	for (const { fix } of await checkSource(raw)) {
		if (fix?.kind !== 'replacement') throw new Error('expected a replacement fix');
		raw = raw.replace(fix.from, () => fix.to);
	}
	return raw.slice(HEADER.length, raw.length - FOOTER.length);
}

describe('description punctuation rule', () => {
	test('accepts descriptions that already close a sentence', async () => {
		for (const ending of ['.', '!', '?', '…', '。', '！', '？']) {
			expect(
				await checkSource(
					`${HEADER}ShortDescription: An app${ending}\nDescription: An app${ending}\n${FOOTER}`,
				),
			).toEqual([]);
		}
		expect(await checkSource(`${HEADER}${FOOTER}`)).toEqual([]);
		expect(
			await checkRule(descriptionPunctuationRule, {
				records: [record('installer'), record('version')],
			}),
		).toEqual([]);
	});

	test('closes both fields, keeping Description out of ShortDescription', async () => {
		const issues = await checkSource(
			`${HEADER}ShortDescription: An app\nDescription: An app\n${FOOTER}`,
		);
		expect(messages(issues)).toEqual([
			'ShortDescription must end with: .',
			'Description must end with: .',
		]);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[1]?.search).toBe('Description: An app');
		expect(await fixed('ShortDescription: An app\nDescription: An app\n')).toBe(
			'ShortDescription: An app.\nDescription: An app.\n',
		);
	});

	test('punctuates inside quotes and after the last line of a block', async () => {
		expect(await fixed("Description: 'An app'\n")).toBe("Description: 'An app.'\n");
		expect(await fixed('Description: "An app"  \r\n')).toBe('Description: "An app."  \r\n');
		expect(await fixed('Description: |-\n  An app.\n\n  - A feature\n\nTags:\n- app\n')).toBe(
			'Description: |-\n  An app.\n\n  - A feature.\n\nTags:\n- app\n',
		);
		expect(await fixed('Description: An app\n  that wraps\n')).toBe(
			'Description: An app\n  that wraps.\n',
		);
		expect(await fixed("Description: Costs $'5\n")).toBe("Description: Costs $'5.\n");
	});

	test('closes Chinese and Japanese text with an ideographic full stop', async () => {
		expect(await fixed('ShortDescription: 工具\nDescription: ツール\n')).toBe(
			'ShortDescription: 工具。\nDescription: ツール。\n',
		);
	});

	test('reports a value its source does not end with, without a fix', async () => {
		const escaped = await checkSource(`${HEADER}Description: "An app\\u0021x\\u0078"\n${FOOTER}`);
		const commented = await checkSource(`${HEADER}ShortDescription: An app # note\n${FOOTER}`);
		const missing = await checkRule(descriptionPunctuationRule, {
			records: [
				record('defaultLocale', {
					manifest: { ...manifest('defaultLocale'), ShortDescription: 'An app' } as never,
				}),
			],
		});
		for (const issues of [escaped, commented, missing]) {
			expect(issues).toHaveLength(1);
			expect(issues[0]?.fix).toBeUndefined();
		}
		expect(commented[0]?.search).toBe('ShortDescription: An app # note');
		expect(missing[0]?.search).toBe('ShortDescription:');
	});
});
