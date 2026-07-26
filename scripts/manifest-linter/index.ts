import { runCli } from '@/scripts/manifest-linter/cli';

export { lintManifests } from '@/scripts/manifest-linter/linter';
export type { LintOptions, LintResult, Rule, RuleContext } from '@/scripts/manifest-linter/types';

if (import.meta.main) process.exitCode = await runCli();
