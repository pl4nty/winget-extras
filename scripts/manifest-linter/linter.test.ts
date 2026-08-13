import { expect, test } from 'bun:test';

import { lintManifests } from '@/scripts/manifest-linter/linter';
import type { Rule } from '@/scripts/manifest-linter/types';

test('runs rules concurrently and attributes asynchronous diagnostics', async () => {
	let secondRuleStarted = false;
	let firstRuleObservedSecond = false;
	const rules: Rule[] = [
		{
			id: 'test/first',
			async check({ report }) {
				await Promise.resolve();
				firstRuleObservedSecond = secondRuleStarted;
				report({ file: 'first.yaml', message: 'first finished' });
			},
		},
		{
			id: 'test/second',
			check({ report }) {
				secondRuleStarted = true;
				report({ file: 'second.yaml', message: 'second finished' });
			},
		},
	];

	const result = await lintManifests({ config: { ignore: {} }, roots: [], rules });

	expect(firstRuleObservedSecond).toBe(true);
	expect(result.diagnostics).toEqual([
		expect.objectContaining({ file: 'first.yaml', ruleId: 'test/first' }),
		expect.objectContaining({ file: 'second.yaml', ruleId: 'test/second' }),
	]);
});

test('ignores matching diagnostics for a configured rule', async () => {
	const rule: Rule = {
		id: 'test/example',
		check({ report }) {
			report({ file: 'manifests/a/Acme/App/1.0/App.yaml', message: 'ignored' });
			report({ file: 'manifests/b/Bravo/App/1.0/App.yaml', message: 'reported' });
		},
	};
	const result = await lintManifests({
		config: {
			ignore: {
				'test/example': { 'manifests/a/Acme/**': 'accepted exception' },
			},
		},
		roots: [],
		rules: [rule],
	});

	expect(result.diagnostics).toEqual([
		expect.objectContaining({ file: 'manifests/b/Bravo/App/1.0/App.yaml' }),
	]);
});
