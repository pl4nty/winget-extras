import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

/**
 * The notice markers upstream metadata uses. They are all spellings of the same
 * thing, so this repository keeps the bare symbol and rewrites the rest, taking
 * a run of them together to collapse pairs like `Copyright (c)`.
 */
const MARKERS = /^(?:copyright|\(c\)|©)(?:[\s,]*(?:copyright|\(c\)|©))*/i;

/**
 * A leading year, date or range, up to the comma that upstream metadata tends
 * to put between it and the holder. A year list such as `2009, 2010, 2013` uses
 * the same comma to separate its own entries, so a following year holds it.
 */
const YEARS =
	/^(\d{4}(?:-\d{2}-\d{2})?(?:\s*[-–—]+\s*(?:\d{4}(?:-\d{2}-\d{2})?|present))?),\s+(?!\d{4}\b)/i;

/** Rewrites one notice to `© <year> <holder>`, leaving one without a marker alone. */
function normalize(notice: string): string {
	const marker = MARKERS.exec(notice);
	if (!marker) return notice;
	const holder = notice
		.slice(marker[0].length)
		.replace(/^[\s,]+/, '')
		.replace(YEARS, '$1 ');
	return holder ? `© ${holder}` : '©';
}

export const copyrightFormatRule = defineRule({
	id: 'repository/copyright-format',
	check({ records, report }) {
		for (const { file, manifest, raw } of records) {
			if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale') continue;
			// A Copyright holding several notices separates them with a line break or a
			// semicolon, and each one is checked and fixed on its own.
			for (const notice of manifest.Copyright?.split(/\n|;\s*/) ?? []) {
				const expected = normalize(notice);
				if (expected === notice) continue;
				// The notice is only rewritten in place when it appears once in the file,
				// so the fix cannot land on a description that quotes the same text.
				const unique = raw.indexOf(notice) >= 0 && raw.indexOf(notice) === raw.lastIndexOf(notice);
				report({
					file,
					level: 'warning',
					message: `Copyright must be written as: ${expected}`,
					search: notice,
					hints: [
						'write the notice as © <year> <holder>, not Copyright or (c), and separate the year from the holder with a space',
					],
					fix: unique ? { kind: 'replacement', from: notice, to: expected } : undefined,
				});
			}
		}
	},
});
