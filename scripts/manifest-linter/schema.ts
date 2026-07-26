import type { ErrorObject, ValidateFunction } from 'ajv';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import * as generatedValidators from '@/scripts/manifest-linter/generated/manifest-validators.js';

const validatorCache = new Map<string, ValidateFunction<WingetManifest> | undefined>();

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
