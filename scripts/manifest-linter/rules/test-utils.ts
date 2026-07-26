import { join } from 'node:path';

import type { WingetManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import type {
	ManifestRecord,
	ManifestSource,
	ReportedDiagnostic,
	RepositoryEntry,
	Root,
	Rule,
} from '@/scripts/manifest-linter/types';

export const IDENTIFIER = 'Acme.App';
export const VERSION = '1.0';
export const SCHEMA_VERSION = '1.28.0';

export type ManifestInput = Record<string, any>;

export function installerManifest(values: ManifestInput = {}): WingetManifest {
	return {
		ManifestType: 'installer',
		ManifestVersion: SCHEMA_VERSION,
		PackageIdentifier: IDENTIFIER,
		PackageVersion: VERSION,
		Installers: [{ Architecture: 'x64' }],
		...values,
	} as WingetManifest;
}

export function manifest(
	type: 'installer' | 'version' | 'locale' | 'defaultLocale',
): WingetManifest {
	const common = {
		PackageIdentifier: IDENTIFIER,
		PackageVersion: VERSION,
		ManifestType: type,
		ManifestVersion: SCHEMA_VERSION,
	};
	if (type === 'installer') return { ...common, Installers: [] } as WingetManifest;
	if (type === 'version') return { ...common, DefaultLocale: 'en-US' } as WingetManifest;
	return { ...common, PackageLocale: 'en-US' } as WingetManifest;
}

export function record(
	type: 'installer' | 'version' | 'locale' | 'defaultLocale',
	options: {
		root?: Root;
		directory?: string;
		file?: string;
		manifest?: WingetManifest;
		raw?: string;
	} = {},
): ManifestRecord {
	const root = options.root ?? 'manifests';
	const directory = options.directory ?? join(root, 'a', 'Acme', 'App', VERSION);
	const data = options.manifest ?? manifest(type);
	const locale = type === 'locale' || type === 'defaultLocale' ? '.locale.en-US' : '';
	const suffix = type === 'installer' ? '.installer' : locale;
	return {
		root,
		directory,
		file: options.file ?? join(directory, `${IDENTIFIER}${suffix}.yaml`),
		manifest: data,
		raw:
			options.raw ??
			`# yaml-language-server: $schema=https://aka.ms/winget-manifest.${type}.${SCHEMA_VERSION}.schema.json\n`,
		encoding: 'utf-8',
	};
}

export function entry(
	parentPath: string,
	name: string,
	kind: 'directory' | 'file' | 'other',
	root: Root = 'manifests',
): RepositoryEntry {
	return {
		root,
		entry: {
			parentPath,
			name,
			isDirectory: () => kind === 'directory',
			isFile: () => kind === 'file',
		},
	};
}

export async function checkRule(
	rule: Rule,
	options: {
		records?: ManifestRecord[];
		entries?: RepositoryEntry[];
		sources?: ManifestSource[];
	} = {},
): Promise<ReportedDiagnostic[]> {
	const issues: ReportedDiagnostic[] = [];
	await rule.check({
		records: options.records ?? [],
		entries: options.entries ?? [],
		sources: options.sources ?? [],
		report: (issue) => issues.push(issue),
	});
	return issues;
}

export async function checkInstallerRule(
	rule: Rule,
	values: ManifestInput = {},
): Promise<ReportedDiagnostic[]> {
	return checkRule(rule, {
		records: [record('installer', { manifest: installerManifest(values) })],
	});
}

export function messages(issues: { message: string }[]): string[] {
	return issues.map((issue) => issue.message);
}
