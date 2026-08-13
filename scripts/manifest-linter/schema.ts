import type { z } from 'zod';

import {
	InstallerManifestSchema,
	LocaleManifestSchema,
	SUPPORTED_MANIFEST_VERSIONS,
	VersionManifestSchema,
	type WingetManifest,
} from '@/scripts/manifest-linter/manifest-schemas';
import type { SourceLocation } from '@/scripts/manifest-linter/types';

export type ManifestSchema = z.ZodType<WingetManifest>;

const supportedManifestVersions = new Set<string>(SUPPORTED_MANIFEST_VERSIONS);
const validatorByType = {
	installer: InstallerManifestSchema,
	locale: LocaleManifestSchema,
	defaultLocale: LocaleManifestSchema,
	version: VersionManifestSchema,
} as const;

export function expandSchemaIssue(issue: z.ZodIssue): z.ZodIssue[] {
	if (issue.code !== 'unrecognized_keys') return [issue];
	return issue.keys.map((key) => ({ ...issue, keys: [key] }));
}

function issuePath(issue: z.ZodIssue): string[] {
	const path = issue.path.map(String);
	if (issue.code === 'unrecognized_keys') {
		const [key] = issue.keys;
		if (key) path.push(key);
	}
	return path;
}

export function locateSchemaError(
	error: z.ZodIssue,
	raw: string,
	manifest: unknown,
): SourceLocation | undefined {
	const parts = issuePath(error);
	const property = parts.at(-1);
	if (!property || /^\d+$/.test(property)) return;

	const value = parts.reduce<unknown>(
		(current, part) => (current as Record<string, unknown> | undefined)?.[part],
		manifest,
	);
	const escaped = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const matches = raw
		.split(/\r?\n/)
		.map((line, index) => ({
			index,
			line,
			match: new RegExp(`\\b${escaped}:`).exec(line),
		}))
		.filter((entry) => entry.match);
	const scalar =
		typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
			? String(value)
			: undefined;
	const valueMatches = matches.filter(
		(entry) => scalar !== undefined && entry.line.slice(entry.match!.index).includes(scalar),
	);
	const occurrence = [...parts].reverse().find((part) => /^\d+$/.test(part));
	const found = valueMatches.length === 1 ? valueMatches[0] : matches[Number(occurrence ?? 0)];
	if (!found?.match) return;

	const column = found.match.index + 1;
	return {
		start: { line: found.index + 1, column },
		end: { line: found.index + 1, column: column + property.length - 1 },
	};
}

export function getSchemaValidator(type: string, version: string): ManifestSchema | undefined {
	if (!supportedManifestVersions.has(version)) return;
	return validatorByType[type as keyof typeof validatorByType] as ManifestSchema | undefined;
}

export function formatSchemaError(error: z.ZodIssue): {
	message: string;
	search?: string;
} {
	const pointer = issuePath(error);
	const location = pointer.reduce(
		(path, part) => (/^\d+$/.test(part) ? `${path}[${part}]` : path ? `${path}.${part}` : part),
		'',
	);
	const property = pointer.at(-1);

	if (error.code === 'unrecognized_keys') {
		const additionalProperty = String(error.keys[0]);
		return {
			message: `property "${additionalProperty}" is not allowed`,
			search: additionalProperty,
		};
	}
	if (error.code === 'invalid_type') {
		const type = String(error.expected);
		const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
		return {
			message: `${location || 'manifest'} must be ${article} ${type}`,
			search: property,
		};
	}
	if (error.code === 'invalid_value' && Array.isArray(error.values) && error.values.length === 1) {
		return {
			message: `${location || 'manifest'} must be ${JSON.stringify(error.values[0])}`,
			search: property,
		};
	}

	return {
		message: `${location || 'manifest'} ${error.message}`,
		search: property,
	};
}
