import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const TERMINAL = /[.!?…。！？]$/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u;

export const descriptionPunctuationRule = defineRule({
	id: 'repository/description-punctuation',
	check({ records, report }) {
		for (const { file, manifest, raw } of records) {
			if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale') continue;
			for (const field of ['ShortDescription', 'Description'] as const) {
				const value = manifest[field]?.trimEnd();
				if (!value || TERMINAL.test(value)) continue;
				const stop = CJK.test(value) ? '。' : '.';
				// The leading line break keeps `Description:` from matching `ShortDescription:`.
				const from =
					new RegExp(`(?:^|\\n)${field}:.*(?:\\n(?:[ \\t].*)?)*`).exec(raw)?.[0].trimEnd() ?? '';
				const end = /^\n?\w+:\s*['"]/.test(from) ? from.length - 1 : from.length;
				// Escapes and comments make the source differ from the value.
				const fixable = from.slice(0, end).endsWith(/.$/su.exec(value)![0]);
				report({
					file,
					level: 'warning',
					message: `${field} must end with: ${stop}`,
					search: from.slice(from.lastIndexOf('\n') + 1) || `${field}:`,
					...(fixable && {
						fix: { kind: 'replacement', from, to: from.slice(0, end) + stop + from.slice(end) },
					}),
				});
			}
		}
	},
});
