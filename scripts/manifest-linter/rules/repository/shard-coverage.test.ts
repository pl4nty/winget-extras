import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { shardCoverageRule } from '@/scripts/manifest-linter/rules/repository/shard-coverage';
import {
	IDENTIFIER,
	checkRule,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

const MESSAGE = 'package has no shard for automated updates';

describe('shard coverage rule', () => {
	test('warns once per package and names both shard locations', async () => {
		const issues = await checkRule(shardCoverageRule, {
			records: [
				record('version', { directory: join('manifests', 'a', 'Acme', 'App', '2.0') }),
				record('installer'),
			],
		});
		expect(messages(issues)).toEqual([MESSAGE]);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.file).toBe(join('manifests', 'a', 'Acme', 'App'));
		expect(issues[0]?.hints).toEqual([
			`add shards/json/${IDENTIFIER}.json or shards/script/${IDENTIFIER}.ts`,
		]);
	});

	test('accepts json, script, and disabled shards regardless of casing', async () => {
		for (const shard of [
			join('shards', 'json', `${IDENTIFIER}.json`),
			join('shards', 'script', `${IDENTIFIER}.ts`),
			join('shards', 'json', `${IDENTIFIER}.json.disabled`),
			join('shards', 'json', `${IDENTIFIER.toLowerCase()}.json`),
		]) {
			const issues = await checkRule(shardCoverageRule, {
				records: [record('version')],
				shards: [shard],
			});
			expect(messages(issues)).toEqual([]);
		}
	});

	test('expects the .Font suffix for font packages', async () => {
		const records = [record('version', { root: 'fonts' })];
		const withoutSuffix = await checkRule(shardCoverageRule, {
			records,
			shards: [join('shards', 'json', `${IDENTIFIER}.json`)],
		});
		expect(messages(withoutSuffix)).toEqual([MESSAGE]);
		expect(withoutSuffix[0]?.hints).toEqual([
			`add shards/json/${IDENTIFIER}.Font.json or shards/script/${IDENTIFIER}.Font.ts`,
		]);

		const withSuffix = await checkRule(shardCoverageRule, {
			records,
			shards: [join('shards', 'json', `${IDENTIFIER}.Font.json`)],
		});
		expect(messages(withSuffix)).toEqual([]);
	});

	test('ignores shards belonging to other packages', async () => {
		const issues = await checkRule(shardCoverageRule, {
			records: [record('version')],
			shards: [join('shards', 'json', 'Other.App.json')],
		});
		expect(messages(issues)).toEqual([MESSAGE]);
	});
});
