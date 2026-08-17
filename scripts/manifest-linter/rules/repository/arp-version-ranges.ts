import { caseFold } from 'unicode-case-folding';

import type { InstallerManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { defineRule } from '@/scripts/manifest-linter/rules/helpers';
import {
	effectiveInstallerType,
	resolveInstaller,
} from '@/scripts/manifest-linter/rules/installer/resolution';
import type { ManifestRecord } from '@/scripts/manifest-linter/types';

type VersionPart = {
	integer: bigint;
	other: string;
};

type WingetVersion = {
	parts: VersionPart[];
	approximateComparator: -1 | 0 | 1;
};

const UINT64_MAX = (1n << 64n) - 1n;
const ASCII_WHITESPACE = /^[\t\n\v\f\r ]+|[\t\n\v\f\r ]+$/g;

function parseInteger(value: string): { integer: bigint; length: number } | undefined {
	const match = /^[+-]?\d+/.exec(value);
	if (!match) return;
	const parsed = BigInt(match[0]);
	const unsigned = parsed < 0 ? (1n << 64n) + parsed : parsed;
	if (unsigned < 0 || unsigned > UINT64_MAX) return;
	return { integer: unsigned, length: match[0].length };
}

function parsePart(value: string): VersionPart {
	const trimmed = value.replace(ASCII_WHITESPACE, '');
	const parsed = parseInteger(trimmed);
	if (!parsed) return { integer: 0n, other: trimmed };
	return {
		integer: parsed.integer,
		other: parsed.length === trimmed.length ? '' : trimmed.slice(parsed.length),
	};
}

function parseVersion(value: string): WingetVersion {
	let baseVersion = value.replace(ASCII_WHITESPACE, '');
	let approximateComparator: -1 | 0 | 1 = 0;
	if (baseVersion.startsWith('< ')) {
		approximateComparator = -1;
		baseVersion = baseVersion.slice(2);
	} else if (baseVersion.startsWith('> ')) {
		approximateComparator = 1;
		baseVersion = baseVersion.slice(2);
	}

	const digit = baseVersion.search(/\d/);
	const separator = baseVersion.indexOf('.');
	if (digit >= 0 && (separator < 0 || digit < separator)) baseVersion = baseVersion.slice(digit);

	const parts = baseVersion ? baseVersion.split('.').map(parsePart) : [];
	while (parts.at(-1)?.integer === 0n && !parts.at(-1)?.other) parts.pop();
	if (
		approximateComparator !== 0 &&
		parts.length === 1 &&
		parts[0]?.integer === 0n &&
		parts[0].other.toLocaleLowerCase('en-US') === 'unknown'
	) {
		throw new Error('an approximate version cannot be Unknown');
	}
	return { parts, approximateComparator };
}

function sentinel(version: WingetVersion): 'latest' | 'unknown' | undefined {
	if (version.parts.length !== 1 || version.parts[0]?.integer !== 0n) return;
	const other = version.parts[0].other.toLocaleLowerCase('en-US');
	if (other === 'latest' || other === 'unknown') return other;
}

function comparePart(left: VersionPart, right: VersionPart): number {
	if (left.integer < right.integer) return -1;
	if (left.integer > right.integer) return 1;
	if (!left.other && right.other) return 1;
	if (left.other && !right.other) return -1;
	const leftOther = caseFold(left.other);
	const rightOther = caseFold(right.other);
	return leftOther < rightOther ? -1 : leftOther > rightOther ? 1 : 0;
}

function compareVersions(left: WingetVersion, right: WingetVersion): number {
	const leftSentinel = sentinel(left);
	const rightSentinel = sentinel(right);
	if (leftSentinel === 'latest' || rightSentinel === 'latest') {
		if (leftSentinel !== rightSentinel) return leftSentinel === 'latest' ? 1 : -1;
		return Math.sign(left.approximateComparator - right.approximateComparator);
	}
	if (leftSentinel === 'unknown' || rightSentinel === 'unknown') {
		if (leftSentinel !== rightSentinel) return leftSentinel === 'unknown' ? -1 : 1;
		return Math.sign(left.approximateComparator - right.approximateComparator);
	}

	const emptyPart: VersionPart = { integer: 0n, other: '' };
	for (let index = 0; index < Math.max(left.parts.length, right.parts.length); index++) {
		const result = comparePart(left.parts[index] ?? emptyPart, right.parts[index] ?? emptyPart);
		if (result) return result;
	}
	return Math.sign(left.approximateComparator - right.approximateComparator);
}

const SUPPORTED_INSTALLER_TYPES = new Set([
	'exe',
	'inno',
	'msi',
	'nullsoft',
	'wix',
	'burn',
	'msix',
]);

type ArpVersionRange = {
	record: ManifestRecord & { manifest: InstallerManifest };
	minimum: WingetVersion;
	maximum: WingetVersion;
	minimumValue: string;
	maximumValue: string;
};

function formatRange(range: ArpVersionRange): string {
	return range.minimumValue === range.maximumValue
		? range.minimumValue
		: `${range.minimumValue}-${range.maximumValue}`;
}

export const arpVersionRangesRule = defineRule({
	id: 'repository/arp-version-ranges',
	check({ records, report }) {
		const packages = new Map<string, ArpVersionRange[]>();
		for (const record of records) {
			const { manifest } = record;
			if (manifest.ManifestType !== 'installer') continue;
			const displayVersions = manifest.Installers.flatMap((installer) => {
				const resolved = resolveInstaller(manifest, installer);
				if (!SUPPORTED_INSTALLER_TYPES.has(String(effectiveInstallerType(resolved)))) return [];
				return resolved.AppsAndFeaturesEntries.flatMap((entry: Record<string, unknown>) =>
					typeof entry.DisplayVersion === 'string' && entry.DisplayVersion
						? [entry.DisplayVersion]
						: [],
				);
			});
			if (!displayVersions.length) continue;

			let minimumValue = displayVersions[0]!;
			let maximumValue = minimumValue;
			let minimum = parseVersion(minimumValue);
			let maximum = minimum;
			for (const value of displayVersions.slice(1)) {
				const version = parseVersion(value);
				if (compareVersions(version, minimum) < 0) {
					minimum = version;
					minimumValue = value;
				} else if (compareVersions(version, maximum) > 0) {
					maximum = version;
					maximumValue = value;
				}
			}
			const range = {
				record: { ...record, manifest },
				minimum,
				maximum,
				minimumValue,
				maximumValue,
			};
			const identifier = manifest.PackageIdentifier.toLocaleLowerCase('en-US');
			const ranges = packages.get(identifier) ?? [];
			ranges.push(range);
			packages.set(identifier, ranges);
		}

		for (const ranges of packages.values()) {
			ranges.sort((left, right) => left.record.file.localeCompare(right.record.file));
			for (let rightIndex = 1; rightIndex < ranges.length; rightIndex++) {
				const right = ranges[rightIndex]!;
				for (const left of ranges.slice(0, rightIndex)) {
					if (
						compareVersions(left.minimum, right.maximum) > 0 ||
						compareVersions(left.maximum, right.minimum) < 0
					) {
						continue;
					}
					report({
						file: right.record.file,
						message: `DisplayVersion range ${formatRange(right)} for PackageVersion ${right.record.manifest.PackageVersion} overlaps ${formatRange(left)} for PackageVersion ${left.record.manifest.PackageVersion}`,
						search: 'DisplayVersion',
						hints: [`conflicting manifest: ${left.record.file}`],
					});
				}
			}
		}
	},
});
