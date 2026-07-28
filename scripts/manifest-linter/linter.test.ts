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

	const result = await lintManifests({ roots: [], rules });

	expect(firstRuleObservedSecond).toBe(true);
	expect(result.diagnostics).toEqual([
		expect.objectContaining({ file: 'first.yaml', ruleId: 'test/first' }),
		expect.objectContaining({ file: 'second.yaml', ruleId: 'test/second' }),
	]);
});
