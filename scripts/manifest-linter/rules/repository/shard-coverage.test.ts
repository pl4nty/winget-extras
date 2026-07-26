import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { shardCoverageRule } from '@/scripts/manifest-linter/rules/repository/shard-coverage';
import {
	IDENTIFIER,
	checkRule,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

describe('shard coverage rule', () => {
	test('warns once per package without a matching shard', async () => {
		const issues = await checkRule(shardCoverageRule, {
			records: [
				record('version'),
				record('version', { root: 'fonts' }),
				record('installer', { root: 'fonts', directory: join('fonts', 'a', 'Acme', 'App', '2.0') }),
			],
			shards: [join('shards', 'json', `${IDENTIFIER}.json`)],
		});
		expect(messages(issues)).toEqual(['package has no shard for automated updates']);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.file).toBe(join('fonts', 'a', 'Acme', 'App'));
		expect(issues[0]?.hints).toEqual([
			`add shards/json/${IDENTIFIER}.Font.json or shards/script/${IDENTIFIER}.Font.ts`,
		]);
	});

	test('accepts script, disabled, and font shards regardless of casing', async () => {
		const issues = await checkRule(shardCoverageRule, {
			records: [record('version'), record('version', { root: 'fonts' })],
			shards: [
				join('shards', 'script', `${IDENTIFIER.toLowerCase()}.ts`),
				join('shards', 'json', `${IDENTIFIER}.Font.json.disabled`),
			],
		});
		expect(issues).toHaveLength(0);
	});
});
