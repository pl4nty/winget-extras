import { describe, expect, test } from 'bun:test';

import { formatGitHubAnnotation, printGitHubAnnotations } from '@/scripts/manifest-linter/reporter';
import type { Diagnostic } from '@/scripts/manifest-linter/types';

function diagnostic(values: Partial<Diagnostic> = {}): Diagnostic {
	return {
		ruleId: 'repository/example',
		level: 'error',
		file: 'manifests/a/Acme.App.yaml',
		message: 'invalid manifest',
		...values,
	};
}

describe('GitHub Actions annotations', () => {
	test('uses the same searched source location as the terminal reporter', () => {
		const sources = new Map([
			['manifests/a/Acme.App.yaml', 'PackageIdentifier: Acme.App\nPackageVersion: 1.0\n'],
		]);
		const output = formatGitHubAnnotation(
			diagnostic({
				level: 'warning',
				search: 'PackageVersion',
				message: 'version is unusual',
			}),
			sources,
		);

		expect(output).toBe(
			'::warning file=manifests/a/Acme.App.yaml,line=2,endLine=2,col=1,endColumn=14,title=Manifest linter%3A repository/example::version is unusual',
		);
	});

	test('escapes workflow command properties and messages without including hints', () => {
		const output = formatGitHubAnnotation(
			diagnostic({
				file: 'manifests/a,b/Acme%App.yaml',
				message: 'bad 100% value\r\ntry again: carefully',
				hints: ['rename a,b'],
				location: {
					start: { line: 3, column: 4 },
					end: { line: 3, column: 8 },
				},
			}),
			new Map(),
		);

		expect(output).toBe(
			'::error file=manifests/a%2Cb/Acme%25App.yaml,line=3,endLine=3,col=4,endColumn=8,title=Manifest linter%3A repository/example::bad 100%25 value%0D%0Atry again: carefully',
		);
	});

	test('writes one annotation per diagnostic', () => {
		let output = '';
		printGitHubAnnotations(
			[diagnostic(), diagnostic({ level: 'warning', message: 'warning' })],
			new Map(),
			(value) => {
				output += value;
			},
		);
		expect(output.split('\n').filter(Boolean)).toHaveLength(2);
		expect(output).toContain('::error ');
		expect(output).toContain('::warning ');
	});
});
