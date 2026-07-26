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
	test('warns once per package and names both shard locations', async () => {
		const issues = await checkRule(shardCoverageRule, {
			records: [
				record('version', { directory: join('manifests', 'a', 'Acme', 'App', '2.0') }),
				record('installer'),
			],
			shards: [join('shards', 'json', 'Other.App.json')],
		});
		expect(messages(issues)).toEqual(['package has no shard for automated updates']);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.file).toBe(join('manifests', 'a', 'Acme', 'App'));
		expect(issues[0]?.hints).toEqual([
			`add shards/json/${IDENTIFIER}.json or shards/script/${IDENTIFIER}.ts`,
		]);
	});

	test('accepts json, script, and disabled shards regardless of casing', async () => {
		const jsonShard = await checkRule(shardCoverageRule, {
			records: [record('version')],
			shards: [join('shards', 'json', `${IDENTIFIER}.json`)],
		});
		expect(jsonShard).toHaveLength(0);

		const scriptShard = await checkRule(shardCoverageRule, {
			records: [record('version')],
			shards: [join('shards', 'script', `${IDENTIFIER.toLowerCase()}.ts`)],
		});
		expect(scriptShard).toHaveLength(0);

		const disabledShard = await checkRule(shardCoverageRule, {
			records: [record('version')],
			shards: [join('shards', 'json', `${IDENTIFIER}.json.disabled`)],
		});
		expect(disabledShard).toHaveLength(0);
	});

	test('expects the .Font suffix for font packages', async () => {
		const withoutSuffix = await checkRule(shardCoverageRule, {
			records: [record('version', { root: 'fonts' })],
			shards: [join('shards', 'json', `${IDENTIFIER}.json`)],
		});
		expect(messages(withoutSuffix)).toEqual(['package has no shard for automated updates']);
		expect(withoutSuffix[0]?.hints).toEqual([
			`add shards/json/${IDENTIFIER}.Font.json or shards/script/${IDENTIFIER}.Font.ts`,
		]);

		const withSuffix = await checkRule(shardCoverageRule, {
			records: [record('version', { root: 'fonts' })],
			shards: [join('shards', 'json', `${IDENTIFIER}.Font.json`)],
		});
		expect(withSuffix).toHaveLength(0);
	});
});
