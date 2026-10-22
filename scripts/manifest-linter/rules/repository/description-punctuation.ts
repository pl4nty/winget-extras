import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import type { SourceLocation } from '@/scripts/manifest-linter/types';

const FIELDS = ['ShortDescription', 'Description'] as const;

// Sentence-final punctuation, including the full-width forms CJK text closes with.
const TERMINAL = /[.!?…。！？]$/u;

// Chinese and Japanese close a sentence with an ideographic full stop.
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]$/u;

// The source of a top-level field, from the line break before its key to just
// past the last character of its value, so a fix lands inside a closing quote
// and after the last line of a block scalar. Starting at the line break keeps
// `Description:` from matching inside `ShortDescription:`.
function scalarSource(raw: string, field: string): { start: number; end?: number } | undefined {
	const key = new RegExp(`(?:^|\\n)${field}:[ \\t]*(.*)`).exec(raw);
	if (!key) return;
	const keyEnd = key.index + key[0].length;
	// A scalar continues over the indented and blank lines that follow its key.
	const continuation = /^(?:\r?\n(?:[ \t][^\r\n]*)?(?=\r?\n|$))*/.exec(raw.slice(keyEnd))![0];
	let end = keyEnd + continuation.trimEnd().length;
	if (end === keyEnd) end = key.index + key[0].trimEnd().length;
	const quote = key[1]?.[0];
	if (quote === "'" || quote === '"') {
		if (raw[end - 1] !== quote) return { start: key.index };
		end--;
	}
	return { start: key.index, end };
}

// The 1-based position of the character at `offset`.
function location(raw: string, offset: number): SourceLocation {
	const lines = raw.slice(0, offset + 1).split('\n');
	const position = { line: lines.length, column: lines.at(-1)!.length };
	return { start: position, end: position };
}

export const descriptionPunctuationRule = defineRule({
	id: 'repository/description-punctuation',
	check({ records, report }) {
		for (const { file, manifest, raw } of records) {
			if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale') continue;
			for (const field of FIELDS) {
				const value = manifest[field]?.trimEnd();
				if (!value || TERMINAL.test(value)) continue;
				const stop = CJK.test(value) ? '。' : '.';
				const message = `${field} must end with: ${stop}`;
				const source = scalarSource(raw, field);
				// Escapes and comments can separate the source from the value. Those are
				// reported without a fix rather than risk an edit in the wrong place.
				if (
					source?.end === undefined ||
					!raw.slice(0, source.end).endsWith(/.$/su.exec(value)![0])
				) {
					report({
						file,
						level: 'warning',
						message,
						...(source && { location: location(raw, raw.indexOf(`${field}:`, source.start)) }),
					});
					continue;
				}
				const from = raw.slice(source.start, source.end);
				report({
					file,
					level: 'warning',
					message,
					location: location(raw, source.end - 1),
					fix: { kind: 'replacement', from, to: `${from}${stop}` },
				});
			}
		}
	},
});
