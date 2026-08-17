import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const LICENSE_LIST_URL = 'https://spdx.org/licenses/licenses.json';

const LICENSE_TRANSLATIONS = {
	en: ['Proprietary', 'Freeware'],
	es: ['Propietario', 'Gratuito'],
	de: ['Proprietär', 'Kostenlos'],
	ja: ['プロプライエタリ', 'フリーウェア'],
	fr: ['Propriétaire', 'Gratuiciel'],
	pt: ['Proprietário', 'Gratuito'],
	ru: ['Проприетарное', 'Бесплатное'],
	it: ['Proprietario', 'Gratuito'],
	nl: ['Proprietair', 'Gratis'],
	pl: ['Zamknięte', 'Darmowe'],
	tr: ['Kapalı kaynak', 'Ücretsiz'],
	zh: ['专有软件', '免费软件', '專有軟件', '免費軟體'],
	id: ['Milik perorangan', 'Gratis'],
	cs: ['Proprietární', 'Bezplatný'],
	fa: ['اختصاصی', 'رایگان'],
	vi: ['Độc quyền', 'Miễn phí'],
	ko: ['사유 소프트웨어', '프리웨어'],
	uk: ['Пропрієтарне', 'Безкоштовне'],
	ar: ['امتلاكية', 'مجانية'],
	hu: ['Zárt forráskódú', 'Ingyenes'],
	sv: ['Proprietär', 'Gratis'],
	ro: ['Proprietar', 'Gratuit'],
	el: ['Ιδιόκτητο', 'Δωρεάν'],
	da: ['Proprietær', 'Gratis'],
	fi: ['Omisteinen', 'Ilmainen'],
	he: ['קניינית', 'חינמית'],
	sk: ['Proprietárny', 'Bezplatný'],
	th: ['จำกัดสิทธิ์', 'ฟรี'],
	bg: ['Собствен', 'Безплатен'],
	hr: ['Vlasnički', 'Besplatni'],
	sr: ['Власнички', 'Бесплатан'],
	nb: ['Proprietær', 'Gratis'],
	lt: ['Uždaras kodas', 'Nemokama'],
	sl: ['Lastniška', 'Brezplačna'],
	ca: ['Propietari', 'Gratuït'],
	et: ['Omanduslik', 'Priivara'],
	no: ['Proprietær', 'Gratis'],
	lv: ['Slēgtais kods', 'Bezmaksas'],
	bn: ['মালিকানাধীন', 'বিনামূল্যের'],
	hi: ['मालिकाना', 'मुफ़्त'],
	bs: ['Vlasnički', 'Besplatni'],
	az: ['Özəl', 'Pulsuz'],
	ka: ['კერძო', 'უფასო'],
	is: ['Séreignarhugbúnaður', 'Ókeypis'],
	uz: ['Proprietar', 'Bepul'],
	ms: ['Hak milik', 'Percuma'],
	mk: ['Сопственичка', 'Бесплатна'],
	kk: ['Меншікті', 'Тегін'],
	sq: ['Pronësor', 'Falas'],
	hy: ['Սեփականատիրական', 'Անվճար'],
} as const;

const CUSTOM_IDENTIFIERS = new Set<string>(Object.values(LICENSE_TRANSLATIONS).flat());

type SpdxLicense = { licenseId: string; isDeprecatedLicenseId?: boolean };

// The published list is the only authority on which identifiers are current, so
// it is fetched once per run. An unreachable list reports nothing rather than
// failing the repository, matching the other network-backed rules.
async function fetchLicenses(): Promise<Map<string, SpdxLicense> | undefined> {
	try {
		const response = await fetch(LICENSE_LIST_URL, { signal: AbortSignal.timeout(10_000) });
		if (!response.ok) return undefined;
		const body = (await response.json()) as { licenses?: SpdxLicense[] };
		if (!body.licenses?.length) return undefined;
		return new Map(body.licenses.map((license) => [license.licenseId, license]));
	} catch {
		return undefined;
	}
}

/**
 * Splits an SPDX expression into the identifiers it references, or returns
 * undefined when the value is not a well-formed expression. The operand after a
 * `WITH` names an exception rather than a license, so it is not returned.
 */
function identifiers(value: string): string[] | undefined {
	if (!/^[\w.+\-()\s]+$/.test(value)) return undefined;
	const ids: string[] = [];
	let expectOperand = true;
	let afterWith = false;
	for (const token of value.split(/[\s()]+/).filter(Boolean)) {
		const isOperator = token === 'AND' || token === 'OR' || token === 'WITH';
		if (isOperator === expectOperand) return undefined;
		if (expectOperand && !afterWith) ids.push(token);
		afterWith = token === 'WITH';
		expectOperand = !expectOperand;
	}
	return expectOperand ? undefined : ids;
}

function accepted(id: string, licenses: Map<string, SpdxLicense>): boolean {
	const license = licenses.get(id);
	return CUSTOM_IDENTIFIERS.has(id) || (license !== undefined && !license.isDeprecatedLicenseId);
}

export const licenseSpdxRule = defineRule({
	id: 'repository/license-spdx',
	async check({ records, report }) {
		const localized = records.some(
			({ manifest }) =>
				manifest.ManifestType === 'locale' || manifest.ManifestType === 'defaultLocale',
		);
		if (!localized) return;

		const licenses = await fetchLicenses();
		if (!licenses) return;

		for (const { file, manifest } of records) {
			if (manifest.ManifestType !== 'locale' && manifest.ManifestType !== 'defaultLocale') continue;
			const value = manifest.License?.trim();
			if (!value) continue;
			if (CUSTOM_IDENTIFIERS.has(value)) continue;

			const unknown = identifiers(value)?.filter((id) => !accepted(id, licenses));
			if (unknown && unknown.length === 0) continue;

			for (const id of unknown?.length ? unknown : [value]) {
				const deprecated = licenses.get(id)?.isDeprecatedLicenseId ?? false;
				report({
					file,
					level: 'warning',
					message: deprecated
						? `License ${id} is a deprecated SPDX identifier`
						: `License ${id} is not an SPDX identifier`,
					search: 'License',
					hints: [
						deprecated
							? `see https://spdx.org/licenses/${id}.html for its replacement`
							: 'use an identifier from https://spdx.org/licenses/, or Proprietary, Freeware, or one of their localized translations for a license SPDX does not list',
					],
				});
			}
		}
	},
});
