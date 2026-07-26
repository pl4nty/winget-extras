import type { Diagnostic, SourceLocation } from '@/scripts/manifest-linter/types';

function highlightSource(code: string, search?: string): SourceLocation {
	const lines = code.split(/\r?\n/);
	if (search) {
		const lineIndex = lines.findIndex((line) => line.includes(search));
		const line = lines.at(lineIndex);
		if (lineIndex >= 0 && line !== undefined) {
			const column = line.indexOf(search) + 1;
			return {
				start: { line: lineIndex + 1, column },
				end: {
					line: lineIndex + 1,
					column: column + Math.max(search.length - 1, 0),
				},
			};
		}
	}

	const lineIndex = Math.max(
		lines.findIndex((line) => line.trim().length > 0 && !line.trimStart().startsWith('#')),
		0,
	);
	return {
		start: { line: lineIndex + 1, column: 1 },
		end: {
			line: lineIndex + 1,
			column: Math.max(lines[lineIndex]?.length ?? 0, 1),
		},
	};
}

function diagnosticLocation(diagnostic: Diagnostic, sources: Map<string, string>): SourceLocation {
	return (
		diagnostic.location ?? highlightSource(sources.get(diagnostic.file) ?? '', diagnostic.search)
	);
}

function escapeCommandData(value: string): string {
	return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}

function escapeCommandProperty(value: string): string {
	return escapeCommandData(value).replaceAll(':', '%3A').replaceAll(',', '%2C');
}

export function formatGitHubAnnotation(
	diagnostic: Diagnostic,
	sources: Map<string, string>,
): string {
	const location = diagnosticLocation(diagnostic, sources);
	const properties = [
		`file=${escapeCommandProperty(diagnostic.file)}`,
		`line=${location.start.line}`,
		`endLine=${location.end.line}`,
		`col=${location.start.column}`,
		`endColumn=${location.end.column}`,
		`title=${escapeCommandProperty(`Manifest linter: ${diagnostic.ruleId}`)}`,
	].join(',');
	return `::${diagnostic.level} ${properties}::${escapeCommandData(diagnostic.message)}`;
}

export function printGitHubAnnotations(
	diagnostics: Diagnostic[],
	sources: Map<string, string>,
	write: (output: string) => unknown = (output) => process.stderr.write(output),
): void {
	for (const diagnostic of diagnostics) {
		write(`${formatGitHubAnnotation(diagnostic, sources)}\n`);
	}
}

export async function printDiagnostics(
	diagnostics: Diagnostic[],
	sources: Map<string, string>,
	coloring: boolean,
): Promise<void> {
	if (!diagnostics.length) return;
	const { default: codeFrame } = await import('@parcel/codeframe');

	for (const diagnostic of diagnostics) {
		const code = sources.get(diagnostic.file) ?? '';
		const location = diagnosticLocation(diagnostic, sources);
		const frame = codeFrame(code, [{ ...location, message: diagnostic.message }], {
			useColor: coloring,
			syntaxHighlighting: coloring,
			language: 'yaml',
			terminalWidth: process.stderr.columns,
			padding: { before: 1, after: 2 },
		});
		process.stderr.write(
			`${diagnostic.level}[${diagnostic.ruleId}] --> ${diagnostic.file}:${location.start.line}:${location.start.column}\n${frame}\n`,
		);
		for (const hint of diagnostic.hints ?? []) process.stderr.write(`  help: ${hint}\n`);
		process.stderr.write('\n');
	}

	const errors = diagnostics.filter((diagnostic) => diagnostic.level === 'error').length;
	const warnings = diagnostics.length - errors;
	if (warnings) process.stderr.write(`\nFound ${warnings} manifest warning(s).\n`);
	if (errors) process.stderr.write(`\nFound ${errors} manifest error(s).\n`);
}
