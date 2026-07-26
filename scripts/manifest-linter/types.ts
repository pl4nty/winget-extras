import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';

export const MANIFEST_ROOTS = ['manifests', 'fonts'] as const;

export type Root = (typeof MANIFEST_ROOTS)[number];

export type RepositoryEntry = {
	root: Root;
	/** Populated once while repository files are loaded. */
	mode?: number;
	entry: {
		name: string;
		parentPath: string;
		isDirectory(): boolean;
		isFile(): boolean;
	};
};

export type ManifestFile = {
	file: string;
	root: Root;
	directory: string;
};

export type TextEncoding = 'utf-8' | 'utf-8-bom' | 'utf-16le' | 'utf-16be' | 'windows-1252';

export type ManifestSource = ManifestFile & {
	raw: string;
	encoding: TextEncoding;
};

export type ManifestRecord = ManifestSource & {
	manifest: WingetManifest;
};

export type SourceLocation = {
	start: { line: number; column: number };
	end: { line: number; column: number };
};

export type DiagnosticFix =
	| { kind: 'contents'; contents: string }
	| { kind: 'replacement'; from: string; to: string }
	| { kind: 'mode'; mode: number };

export type Diagnostic = {
	ruleId: string;
	level: 'error' | 'warning';
	file: string;
	message: string;
	search?: string;
	hints?: string[];
	location?: SourceLocation;
	fix?: DiagnosticFix;
};

export type ReportedDiagnostic = Omit<Diagnostic, 'level' | 'ruleId'> & {
	level?: Diagnostic['level'];
};

export type RuleContext = {
	readonly entries: RepositoryEntry[];
	readonly sources: ManifestSource[];
	readonly records: ManifestRecord[];
	report: (diagnostic: ReportedDiagnostic) => void;
};

export type Rule = {
	/** Stable identifier displayed with diagnostics and used to select the rule in tests. */
	id: string;
	check(context: RuleContext): void | Promise<void>;
};

export type LintOptions = {
	fix?: boolean;
	rules?: readonly Rule[];
	roots?: readonly Root[];
};

export type LintResult = {
	diagnostics: Diagnostic[];
	fixedFiles: string[];
	records: ManifestRecord[];
	sources: Map<string, string>;
};
