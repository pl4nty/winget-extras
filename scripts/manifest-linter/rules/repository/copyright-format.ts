import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

// Matched as a run, so that a pair like `Copyright (c)` collapses to one symbol.
// A notice does not always open with one: `Digitized data copyright (c) 2012`
// qualifies what is covered first.
const MARKERS = /(?:copyright|\(c\)|©)(?:[\s,]*(?:copyright|\(c\)|©))*/i;

// The comma upstream puts between the year and the holder. A year list such as
// `2009, 2010, 2013` separates its own entries with the same comma, so a year
// after it holds the match back.
const YEARS =
	/^(\d{4}(?:-\d{2}-\d{2})?(?:\s*[-–—]+\s*(?:\d{4}(?:-\d{2}-\d{2})?|present))?),\s+(?!\d{4}\b)/i;

function normalizedNotice(notice: string): string {
	const marker = MARKERS.exec(notice);
	if (!marker) return notice;
	const holder = notice
		.slice(marker.index + marker[0].length)
		.replace(/^[\s,]+/, '')
		.replace(YEARS, '$1 ')
		.trimEnd();
	const normalized = [notice.slice(0, marker.index).trimEnd(), '©', holder]
		.filter(Boolean)
		.join(' ');
	return normalized.endsWith('.') ? normalized : `${normalized}.`;
}

export const copyrightFormatRule = defineRule({
	id: 'repository/copyright-format',
	check({ records, report }) {
		for (const { file, manifest } of records) {
			if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale') continue;
			// A Copyright holding several notices separates them with a line break or a
			// semicolon, and each one is normalized on its own.
			for (const notice of manifest.Copyright?.split(/\n|;\s*/) ?? []) {
				const expected = normalizedNotice(notice);
				if (expected === notice) continue;
				report({
					file,
					level: 'warning',
					message: `Copyright must be written as: ${expected}`,
					search: notice,
					fix: { kind: 'replacement', from: notice, to: expected },
				});
			}
		}
	},
});
