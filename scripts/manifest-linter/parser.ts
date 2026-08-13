import { parseYaml } from '@unownplain/anthelion-komac';

import type { WingetManifest } from '@/scripts/manifest-linter/manifest-schemas';
import {
	expandSchemaIssue,
	formatSchemaError,
	getSchemaValidator,
	locateSchemaError,
} from '@/scripts/manifest-linter/schema';
import type { ReportedDiagnostic } from '@/scripts/manifest-linter/types';

type ParseResult = WingetManifest | undefined;

type YamlParseError = Error & {
	location?: {
		start: { line: number; column: number };
		end: { line: number; column: number };
	};
};

function validateManifest(
	file: string,
	raw: string,
	parsed: unknown,
	report: (diagnostic: ReportedDiagnostic) => void,
): ParseResult {
	const manifest = parsed as Record<string, unknown> | null | undefined;
	const type = String(manifest?.ManifestType);
	const version = String(manifest?.ManifestVersion);
	const validate = getSchemaValidator(type, version);
	if (!validate) {
		report({
			file,
			message: `schema ${version}/${type} is not supported`,
			search: 'ManifestVersion',
		});
		return;
	}
	const result = validate.safeParse(parsed);
	if (!result.success) {
		for (const issue of result.error.issues) {
			for (const error of expandSchemaIssue(issue)) {
				const formatted = formatSchemaError(error);
				report({ file, ...formatted, location: locateSchemaError(error, raw, parsed) });
			}
		}
		return;
	}
	return result.data;
}

export function parseManifest(
	file: string,
	raw: string,
	report: (diagnostic: ReportedDiagnostic) => void,
): ParseResult {
	let parsed: unknown;
	try {
		parsed = parseYaml(raw);
	} catch (error) {
		const yamlError = error as YamlParseError;
		report({
			file,
			message: `invalid YAML: ${yamlError.message}`,
			location: yamlError.location,
		});
		return;
	}
	return validateManifest(file, raw, parsed, report);
}
