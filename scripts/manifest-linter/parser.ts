import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { formatSchemaError, getSchemaValidator } from '@/scripts/manifest-linter/schema';
import type { ReportedDiagnostic } from '@/scripts/manifest-linter/types';

type ParseResult = WingetManifest | undefined;
type MappingFrame = { indent: number; keys: Set<string> };

const SIMPLE_KEY = /^([A-Za-z][A-Za-z0-9]*):(?:\s|$)/;
const BLOCK_SCALAR = /^[|>](?:[+-]?\d?|\d?[+-]?)(?:\s|$)/;
const QUOTED_KEY = /^(?:"(?:[^"\\]|\\.)*"|'(?:[^']|'')*')\s*:/;

/**
 * Bun's native parser intentionally accepts duplicate mapping keys. Detect the
 * simple block mappings used by manifests, and route complex mapping syntax to
 * the full parser. Repeated keys in separate sequence items remain independent.
 */
function requiresDetailedParser(raw: string): boolean {
	const frames: MappingFrame[] = [];
	let blockScalarIndent: number | undefined;

	for (const line of raw.split(/\r?\n/)) {
		if (!line.trim() || line.trimStart().startsWith('#')) continue;
		const indent = line.length - line.trimStart().length;
		if (blockScalarIndent !== undefined) {
			if (indent > blockScalarIndent) continue;
			blockScalarIndent = undefined;
		}

		let mappingIndent = indent;
		let candidate = line.slice(indent);
		const sequenceItem = candidate.startsWith('- ');
		if (sequenceItem) {
			mappingIndent += 2;
			candidate = candidate.slice(2);
		}

		// Quoted/explicit keys and flow mappings are uncommon in manifests. Let the
		// detailed parser handle them so the fast path never changes their semantics.
		if (
			candidate.startsWith('? ') ||
			QUOTED_KEY.test(candidate) ||
			candidate.startsWith('{') ||
			/:\s*\{/.test(candidate)
		) {
			return true;
		}

		while (
			frames.length &&
			(frames.at(-1)!.indent > mappingIndent ||
				(sequenceItem && frames.at(-1)!.indent === mappingIndent))
		) {
			frames.pop();
		}

		const match = SIMPLE_KEY.exec(candidate);
		if (!match) continue;
		let frame = frames.at(-1);
		if (!frame || frame.indent !== mappingIndent) {
			frame = { indent: mappingIndent, keys: new Set() };
			frames.push(frame);
		}

		const key = match[1]!;
		if (frame.keys.has(key)) return true;
		frame.keys.add(key);
		if (BLOCK_SCALAR.test(candidate.slice(match[0].length).trimStart())) {
			blockScalarIndent = mappingIndent;
		}
	}

	return false;
}

function validateManifest(
	file: string,
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
			report({ file, ...formatted });
		}
		return;
	}
	return parsed as WingetManifest;
}

async function parseWithDetailedErrors(
	file: string,
	raw: string,
	report: (diagnostic: ReportedDiagnostic) => void,
): Promise<ParseResult> {
	try {
		const { LineCounter, parseDocument } = await import('yaml');
		const lineCounter = new LineCounter();
		const document = parseDocument(raw, { lineCounter, prettyErrors: false });
		for (const error of document.errors) {
			const start = lineCounter.linePos(error.pos[0]);
			const end = lineCounter.linePos(Math.max(error.pos[1] - 1, error.pos[0]));
			report({
				file,
				message: `invalid YAML: ${error.message}`,
				location: {
					start: { line: start.line, column: start.col },
					end: { line: end.line, column: end.col },
				},
			});
		}
		if (document.errors.length) return;
		return validateManifest(file, document.toJS(), report);
	} catch (error) {
		report({
			file,
			message: `invalid YAML: ${error instanceof Error ? error.message : String(error)}`,
		});
	}
}

export function parseManifest(
	file: string,
	raw: string,
	report: (diagnostic: ReportedDiagnostic) => void,
): ParseResult | Promise<ParseResult> {
	if (requiresDetailedParser(raw)) return parseWithDetailedErrors(file, raw, report);
	try {
		return validateManifest(file, Bun.YAML.parse(raw), report);
	} catch {
		// Keep valid manifests on Bun's native parser. Load the full parser only
		// when needed so invalid YAML still gets an exact source range.
		return parseWithDetailedErrors(file, raw, report);
	}
}
