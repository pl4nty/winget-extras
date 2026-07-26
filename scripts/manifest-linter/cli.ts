import { lintManifests } from '@/scripts/manifest-linter/linter';
import { printDiagnostics, printGitHubAnnotations } from '@/scripts/manifest-linter/reporter';

export async function runCli(args = process.argv.slice(2)): Promise<number> {
	const coloring = process.env.FORCE_COLOR !== '0' && process.env.FORCE_COLOR !== 'false';
	if (coloring && !process.env.FORCE_COLOR) process.env.FORCE_COLOR = '1';

	const fix = args.includes('--fix');
	const denyWarnings = args.includes('--deny-warnings');
	const result = await lintManifests({ fix });
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
