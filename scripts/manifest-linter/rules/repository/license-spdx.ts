import type { LocalizationManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import type { ManifestRecord } from '@/scripts/manifest-linter/types';

const LICENSE_LIST_URL = 'https://spdx.org/licenses/licenses.json';

/**
 * Deprecated identifiers whose replacement cannot be derived from the identifier
 * itself. The GNU family is handled by {@link replacementFor} instead, and the
 * `GPL-*-with-*-exception` identifiers are left without a suggestion because
 * their replacements are `WITH` expressions over the separate exception list.
 */
const DEPRECATED_REPLACEMENTS: Record<string, string> = {
	'BSD-2-Clause-FreeBSD': 'BSD-2-Clause-Views',
	'BSD-2-Clause-NetBSD': 'BSD-2-Clause',
	'StandardML-NJ': 'SMLNJ',
	'bzip2-1.0.5': 'bzip2-1.0.6',
};

/** Shorthand that is common in manifests but normalizes to no SPDX name. */
const SHORTHAND: [RegExp, string][] = [[/^bsd-?([234])(?:-?clause)?$/i, 'BSD-$1-Clause']];

type SpdxLicense = {
	licenseId: string;
	name: string;
	isDeprecatedLicenseId?: boolean;
};

type LicenseList = {
	/** Every published identifier, keyed exactly as SPDX publishes it. */
	byId: Map<string, SpdxLicense>;
	/** Identifiers and full names keyed by {@link normalize}; ambiguous keys are dropped. */
	byNormalized: Map<string, SpdxLicense | undefined>;
};

/**
 * Reduces an identifier or a license name to a comparison key, so that `GPLv3`,
 * `GPL-3.0` and `GNU General Public License version 3.0` all collide, while
 * distinct licenses stay distinct. Ambiguous keys are discarded when the table
 * is built, so a collision between two licenses suggests neither.
 */
function normalize(value: string): string {
	const words = value
		.toLowerCase()
		.replaceAll('+', ' plus ')
		.replace(/\b(?:version|licen[cs]e|the)\b/g, ' ')
		.replace(/([a-z])v(\d)/g, '$1 $2')
		.replace(/(^|[^a-z0-9])v(\d)/g, '$1$2')
		.split(/[^a-z0-9.]+/)
		.filter(Boolean);
	return words
		.map((word) =>
			/^\d+(?:\.\d+)*$/.test(word) ? word.replace(/(?:\.0)+$/, '') : word.replaceAll('.', ''),
		)
		.join('');
}

function buildLicenseList(licenses: SpdxLicense[]): LicenseList {
	const byId = new Map(licenses.map((license) => [license.licenseId, license]));
	const byNormalized = new Map<string, SpdxLicense | undefined>();
	const add = (key: string, license: SpdxLicense) => {
		if (!key) return;
		if (!byNormalized.has(key)) {
			byNormalized.set(key, license);
			return;
		}
		const existing = byNormalized.get(key);
		if (!existing || existing.licenseId === license.licenseId) return;
		// Prefer a current identifier over a deprecated one, otherwise suggest neither.
		if (existing.isDeprecatedLicenseId && !license.isDeprecatedLicenseId) {
			byNormalized.set(key, license);
		} else if (!license.isDeprecatedLicenseId) byNormalized.set(key, undefined);
	};
	for (const license of licenses) add(normalize(license.licenseId), license);
	for (const license of licenses) add(normalize(license.name), license);
	return { byId, byNormalized };
}

// The published list is the only authority on which identifiers are current, so
// it is fetched once per run. An unreachable list reports nothing rather than
// failing the repository, matching the other network-backed rules.
async function fetchLicenseList(): Promise<LicenseList | undefined> {
	try {
		const response = await fetch(LICENSE_LIST_URL, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return undefined;
		const body = (await response.json()) as { licenses?: SpdxLicense[] };
		if (!Array.isArray(body.licenses) || body.licenses.length === 0) return undefined;
		return buildLicenseList(body.licenses);
	} catch {
		return undefined;
	}
}

/** Resolves a deprecated identifier to the current one where SPDX allows it. */
function replacementFor(license: SpdxLicense, list: LicenseList): string | undefined {
	const id = license.licenseId;
	const explicit = DEPRECATED_REPLACEMENTS[id];
	if (explicit) return list.byId.has(explicit) ? explicit : undefined;
	const derived = id.endsWith('+') ? `${id.slice(0, -1)}-or-later` : `${id}-only`;
	const target = list.byId.get(derived);
	return target && !target.isDeprecatedLicenseId ? derived : undefined;
}

function describeLicense(id: string, list: LicenseList): string {
	const name = list.byId.get(id)?.name;
	return `${id}${name ? ` (${name})` : ''}, see https://spdx.org/licenses/${id}.html`;
}

/**
 * Splits `A OR B` and `A AND B` into their operands. Expressions using `WITH`
 * reference the separate exception list and are left alone, as is anything that
 * is not a well-formed expression over identifier-shaped tokens.
 */
function operands(value: string): string[] | undefined {
	if (!/^[\w.+\-()\s]+$/.test(value)) return undefined;
	const tokens = value.split(/[\s()]+/).filter(Boolean);
	if (tokens.length < 3 || tokens.includes('WITH')) return undefined;
	const licenses: string[] = [];
	for (const [index, token] of tokens.entries()) {
		const isOperator = index % 2 === 1;
		if (isOperator !== (token === 'AND' || token === 'OR')) return undefined;
		if (!isOperator) licenses.push(token);
	}
	return tokens.length % 2 === 1 ? licenses : undefined;
}

function shorthandFor(value: string): string | undefined {
	for (const [pattern, replacement] of SHORTHAND) {
		if (pattern.test(value)) return value.replace(pattern, replacement);
	}
	return undefined;
}

type Suggestion = { message: string; hint: string };

function review(value: string, list: LicenseList, inExpression: boolean): Suggestion | undefined {
	// LicenseRef-* is how SPDX spells a license that has no published identifier.
	if (value.startsWith('LicenseRef-')) return undefined;

	const exact = list.byId.get(value);
	if (exact && !exact.isDeprecatedLicenseId) return undefined;
	if (exact) {
		const replacement = replacementFor(exact, list);
		return {
			message: `License ${value} is a deprecated SPDX identifier`,
			hint: replacement
				? `use ${describeLicense(replacement, list)}`
				: `see https://spdx.org/licenses/${value}.html for its replacement`,
		};
	}

	// Only whole values are guessed at. Inside an expression an unknown operand is
	// more likely a custom license than a typo, and rewriting one operand of an
	// expression is not a suggestion the author can apply verbatim.
	if (inExpression) return undefined;

	const shorthand = shorthandFor(value);
	const matched = shorthand ? list.byId.get(shorthand) : list.byNormalized.get(normalize(value));
	if (!matched) return undefined;
	if (!matched.isDeprecatedLicenseId) {
		return {
			message: `License ${value} looks like the SPDX identifier ${matched.licenseId}`,
			hint: `use ${describeLicense(matched.licenseId, list)}`,
		};
	}

	const replacement = replacementFor(matched, list);
	if (replacement) {
		return {
			message: `License ${value} looks like the SPDX identifier ${replacement}`,
			hint: `use ${describeLicense(replacement, list)}`,
		};
	}
	return {
		message: `License ${value} looks like the deprecated SPDX identifier ${matched.licenseId}`,
		hint: `see https://spdx.org/licenses/${matched.licenseId}.html for its replacement`,
	};
}

export const licenseSpdxRule = defineRule({
	id: 'repository/license-spdx',
	async check({ records, report }) {
		const licensed = records.filter(
			(record): record is ManifestRecord & { manifest: LocalizationManifest } =>
				record.manifest.ManifestType === 'locale' ||
				record.manifest.ManifestType === 'defaultLocale',
		);
		if (licensed.length === 0) return;

		const list = await fetchLicenseList();
		if (!list) return;

		for (const { file, manifest } of licensed) {
			const value = manifest.License?.trim();
			if (!value || value.includes('\n')) continue;

			const parts = operands(value);
			for (const part of parts ?? [value]) {
				const suggestion = review(part, list, parts !== undefined);
				if (!suggestion) continue;
				report({
					file,
					level: 'warning',
					message: suggestion.message,
					search: 'License:',
					hints: [suggestion.hint],
				});
			}
		}
	},
});
