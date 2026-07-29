import { parseYaml } from '@unownplain/anthelion-komac';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import {
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

function formatYamlParseError(error: unknown): string {
	if (!(error instanceof Error)) return String(error);
	const firstLine = error.message.split(/\r?\n/, 1)[0] ?? error.message;
	return /^error: line \d+ column \d+: (.*)$/.exec(firstLine)?.[1] ?? firstLine;
}

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
	if (!validate(parsed)) {
		for (const error of validate.errors ?? []) {
			const formatted = formatSchemaError(error);
			report({ file, ...formatted, location: locateSchemaError(error, raw, parsed) });
		}
		return;
	}
	return parsed as WingetManifest;
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
			message: `invalid YAML: ${formatYamlParseError(error)}`,
			location: yamlError.location,
		});
		return;
	}
	return validateManifest(file, raw, parsed, report);
}
