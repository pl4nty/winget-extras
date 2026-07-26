import { chmod, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { parseManifest } from '@/scripts/manifest-linter/parser';
import { defaultRules } from '@/scripts/manifest-linter/rules';
import { decodeManifestText } from '@/scripts/manifest-linter/text-encoding';
import {
	MANIFEST_ROOTS,
	type Diagnostic,
	type LintOptions,
	type LintResult,
	type ManifestRecord,
	type ManifestSource,
	type ReportedDiagnostic,
	type RepositoryEntry,
} from '@/scripts/manifest-linter/types';

const PARSER_RULE_ID = 'schema';

async function scanRepository(
	roots: NonNullable<LintOptions['roots']>,
): Promise<RepositoryEntry[]> {
	return (
		await Promise.all(
			roots.map(async (root) => ({
				root,
				entries: await readdir(root, { recursive: true, withFileTypes: true }),
			})),
		)
	).flatMap(({ root, entries }) => entries.map((entry) => ({ root, entry })));
}

async function loadSources(entries: RepositoryEntry[]): Promise<ManifestSource[]> {
	return Promise.all(
		entries
			.filter(({ entry }) => entry.isFile() && entry.name.endsWith('.yaml'))
			.map(async ({ root, entry }) => {
				const file = join(entry.parentPath, entry.name);
				const decoded = decodeManifestText(await readFile(file));
				return {
					file,
					root,
					directory: entry.parentPath,
					raw: decoded.text,
					encoding: decoded.encoding,
				};
			}),
	);
}

async function loadFileModes(entries: RepositoryEntry[]): Promise<void> {
	await Promise.all(
		entries.map(async (repositoryEntry) => {
			const { entry } = repositoryEntry;
			if (!entry.isFile()) return;
			const file = join(entry.parentPath, entry.name);
			repositoryEntry.mode = (await stat(file)).mode & 0o777;
		}),
	);
}

async function parseSources(
	sources: ManifestSource[],
	parseNonUtf8: boolean,
	report: (diagnostic: ReportedDiagnostic) => void,
): Promise<ManifestRecord[]> {
	const records: Array<ManifestRecord | undefined> = Array.from({ length: sources.length });
	const pending: Promise<void>[] = [];
	for (const [index, source] of sources.entries()) {
		// In check mode, stop after the encoding error. Fix mode can safely validate
		// the decoded text and combine encoding and content fixes in one pass.
		if (!parseNonUtf8 && source.encoding !== 'utf-8' && source.encoding !== 'utf-8-bom') {
			continue;
		}
		const result = parseManifest(source.file, source.raw, report);
		if (result instanceof Promise) {
			pending.push(
				result.then((manifest) => {
					if (manifest) records[index] = { ...source, manifest };
				}),
			);
		} else if (result) records[index] = { ...source, manifest: result };
	}
	await Promise.all(pending);
	return records.filter((record) => record !== undefined);
}

async function applyFixes(
	diagnostics: Diagnostic[],
	sources: Map<string, string>,
): Promise<string[]> {
	const contents = new Map<string, string>();
	const modes = new Map<string, number>();

	for (const diagnostic of diagnostics) {
		const fix = diagnostic.fix;
		if (!fix) continue;
		if (fix.kind === 'mode') {
			modes.set(diagnostic.file, fix.mode);
			continue;
		}

		const current = contents.get(diagnostic.file) ?? sources.get(diagnostic.file) ?? '';
		contents.set(
			diagnostic.file,
			fix.kind === 'contents' ? fix.contents : current.replace(fix.from, fix.to),
		);
	}

	await Promise.all([
		...[...contents].map(([file, raw]) => writeFile(file, raw)),
		...[...modes].map(([file, mode]) => chmod(file, mode)),
	]);
	return [...new Set([...contents.keys(), ...modes.keys()])].sort();
}

export async function lintManifests(options: LintOptions = {}): Promise<LintResult> {
	const entries = await scanRepository(options.roots ?? MANIFEST_ROOTS);
	const [manifestSources] = await Promise.all([loadSources(entries), loadFileModes(entries)]);
	const diagnostics: Diagnostic[] = [];
	let activeRuleId = PARSER_RULE_ID;
	const report = (diagnostic: ReportedDiagnostic): void => {
		diagnostics.push({
			...diagnostic,
			ruleId: activeRuleId,
			level: diagnostic.level ?? 'error',
		});
	};
	const records = await parseSources(manifestSources, options.fix ?? false, report);

	for (const rule of options.rules ?? defaultRules) {
		activeRuleId = rule.id;
		await rule.check({ entries, sources: manifestSources, records, report });
	}

	diagnostics.sort(
		(a, b) =>
			a.file.localeCompare(b.file) ||
			a.message.localeCompare(b.message) ||
			a.ruleId.localeCompare(b.ruleId),
	);
	const sourceMap = new Map(manifestSources.map((source) => [source.file, source.raw]));
	const fixedFiles = options.fix ? await applyFixes(diagnostics, sourceMap) : [];
	return {
		diagnostics: options.fix ? diagnostics.filter((diagnostic) => !diagnostic.fix) : diagnostics,
		fixedFiles,
		records,
		sources: sourceMap,
	};
}
