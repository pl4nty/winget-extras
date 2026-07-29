import type { ErrorObject, ValidateFunction } from 'ajv';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import * as generatedValidators from '@/scripts/manifest-linter/generated/manifest-validators.js';
import type { SourceLocation } from '@/scripts/manifest-linter/types';

const validatorCache = new Map<string, ValidateFunction<WingetManifest> | undefined>();

export function locateSchemaError(
	error: ErrorObject,
	raw: string,
	manifest: unknown,
): SourceLocation | undefined {
	const parts = error.instancePath
		.split('/')
		.slice(1)
		.map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
	if (error.keyword === 'additionalProperties') {
		parts.push(String(error.params.additionalProperty));
	}
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

export function getSchemaValidator(
	type: string,
	version: string,
): ValidateFunction<WingetManifest> | undefined {
	const key = `${type}/${version}`;
	if (validatorCache.has(key)) return validatorCache.get(key);
	const name = `validate_${type}_${version.replaceAll('.', '_')}`;
	const validator = generatedValidators[name as keyof typeof generatedValidators] as
		| ValidateFunction<WingetManifest>
		| undefined;
	validatorCache.set(key, validator);
	return validator;
}

export function formatSchemaError(error: ErrorObject): {
	message: string;
	search?: string;
} {
	const pointer = error.instancePath
		.split('/')
		.slice(1)
		.map((part) => part.replaceAll('~1', '/').replaceAll('~0', '~'));
	const location = pointer.reduce(
		(path, part) => (/^\d+$/.test(part) ? `${path}[${part}]` : path ? `${path}.${part}` : part),
		'',
	);
	const property = pointer.at(-1);

	if (error.keyword === 'additionalProperties') {
		const additionalProperty = String(error.params.additionalProperty);
		return {
			message: `property "${additionalProperty}" is not allowed`,
			search: additionalProperty,
		};
	}
	if (error.keyword === 'required') {
		const missingProperty = String(error.params.missingProperty);
		return {
			message: `missing required property "${missingProperty}"`,
			search: missingProperty,
		};
	}
	if (error.keyword === 'type') {
		const type = String(error.params.type);
		const article = /^[aeiou]/i.test(type) ? 'an' : 'a';
		return {
			message: `${location || 'manifest'} must be ${article} ${type}`,
			search: property,
		};
	}
	if (error.keyword === 'const') {
		return {
			message: `${location || 'manifest'} must be ${JSON.stringify(error.params.allowedValue)}`,
			search: property,
		};
	}

	return {
		message: `${location || 'manifest'} ${error.message ?? error.keyword}`,
		search: property,
	};
}
