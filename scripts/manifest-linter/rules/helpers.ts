import type { InstallerManifest } from '@/scripts/manifest-linter/generated/manifest-types';
import { resolveInstaller } from '@/scripts/manifest-linter/rules/installer/resolution';
import type {
	ManifestRecord,
	ReportedDiagnostic,
	Rule,
	RuleContext,
} from '@/scripts/manifest-linter/types';

export type InstallerEntry = InstallerManifest['Installers'][number];
export type ResolvedInstaller = Record<string, any>;

export type InstallerRuleContext = {
	record: ManifestRecord & { manifest: InstallerManifest };
	manifest: InstallerManifest;
	installers: ResolvedInstaller[];
	report: (diagnostic: Omit<ReportedDiagnostic, 'file'>) => void;
};

const resolvedInstallerCache = new WeakMap<InstallerManifest, ResolvedInstaller[]>();

function resolvedInstallers(manifest: InstallerManifest): ResolvedInstaller[] {
	const cached = resolvedInstallerCache.get(manifest);
	if (cached) return cached;
	const installers = manifest.Installers.map((installer) => resolveInstaller(manifest, installer));
	resolvedInstallerCache.set(manifest, installers);
	return installers;
}

export function defineRule(rule: Rule): Rule {
	return rule;
}

/**
 * Adapts an installer-specific check to the generic rule API. A new installer
 * rule only needs an id and one check function; iteration and issue attribution
 * stay here.
 */
export function defineInstallerRule(rule: {
	id: string;
	check(context: InstallerRuleContext): void | Promise<void>;
}): Rule {
	return defineRule({
		id: rule.id,
		check(context: RuleContext) {
			const pending: Promise<void>[] = [];
			for (const record of context.records) {
				if (record.manifest.ManifestType !== 'installer') continue;
				const manifest = record.manifest;
				const result = rule.check({
					record: { ...record, manifest },
					manifest,
					installers: resolvedInstallers(manifest),
					report: (diagnostic) => context.report({ file: record.file, ...diagnostic }),
				});
				if (result) pending.push(result);
			}
			if (pending.length) return Promise.all(pending).then(() => undefined);
		},
	});
}
