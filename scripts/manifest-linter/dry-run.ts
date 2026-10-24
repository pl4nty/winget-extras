import { readFile } from 'node:fs/promises';

import { lintManifests } from '@/scripts/manifest-linter/linter';
import { printGitHubAnnotations } from '@/scripts/manifest-linter/reporter';
import { dryRunRule } from '@/scripts/manifest-linter/rules/repository/dry-run';

// Runs only repository/dry-run, which is not part of regular linting.
// usage: CHANGED_MANIFESTS='["manifests/..."]' bun manifests:dry-run <step summary>
const [summary] = process.argv.slice(2);
if (!summary) throw new Error('usage: bun manifests:dry-run <step summary>');

const changed: string[] = JSON.parse(process.env.CHANGED_MANIFESTS || '[]');
const { diagnostics, sources } = await lintManifests({
	rules: [dryRunRule(await readFile(summary, 'utf8'), changed)],
});
printGitHubAnnotations(diagnostics, sources);
if (diagnostics.some((diagnostic) => diagnostic.level === 'error')) process.exitCode = 1;
