import { lintManifests } from '@/scripts/manifest-linter/linter';
import { printDiagnostics, printGitHubAnnotations } from '@/scripts/manifest-linter/reporter';
import { defaultRules, optInRules } from '@/scripts/manifest-linter/rules';

export async function runCli(args = process.argv.slice(2)): Promise<number> {
	const coloring = process.env.FORCE_COLOR !== '0' && process.env.FORCE_COLOR !== 'false';
	if (coloring && !process.env.FORCE_COLOR) process.env.FORCE_COLOR = '1';

	const fix = args.includes('--fix');
	const denyWarnings = args.includes('--deny-warnings');
	const ruleId = args.includes('--rule') ? args[args.indexOf('--rule') + 1] : undefined;
	const rules = ruleId
		? [...defaultRules, ...optInRules].filter((rule) => rule.id === ruleId)
		: undefined;
	if (rules?.length === 0) throw new Error(`unknown linter rule: ${ruleId}`);
	const result = await lintManifests({ fix, rules });
	await printDiagnostics(result.diagnostics, result.sources, coloring);

	if (fix) console.log(`Fixed ${result.fixedFiles.length} file(s).`);
	const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === 'error');
	const warnings = result.diagnostics.filter((diagnostic) => diagnostic.level === 'warning');
	const failed = errors.length > 0 || (denyWarnings && warnings.length > 0);

	if (process.env.GITHUB_ACTIONS === 'true') {
		printGitHubAnnotations(result.diagnostics, result.sources);
	}

	if (!failed) {
		console.log(
			`Manifests OK (${result.records.length} files${warnings.length ? `; ${warnings.length} warning(s)` : ''}).`,
		);
	}

	return failed ? 1 : 0;
}
