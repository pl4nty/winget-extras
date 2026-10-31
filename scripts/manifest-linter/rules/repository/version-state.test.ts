import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { versionStateRule } from '@/scripts/manifest-linter/rules/repository/version-state';
import { checkRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

async function checkShards(shards: Record<string, string>, seeds: string[] = []) {
	const root = await mkdtemp(join(tmpdir(), 'version-state-'));
	await Promise.all(
		['json', 'script', '../version-state'].map((dir) =>
			mkdir(join(root, 'shards', dir), { recursive: true }),
		),
	);
	await Promise.all([
		...Object.entries(shards).map(([path, contents]) =>
			writeFile(join(root, 'shards', path), contents),
		),
		...seeds.map((seed) => writeFile(join(root, 'version-state', seed), 'state')),
	]);
	return checkRule(versionStateRule, {
		shards: Object.keys(shards).map((path) => join(root, 'shards', path)),
	});
}

describe('version state rule', () => {
	test('reports JSON and script shards that return state without a seed', async () => {
		const issues = await checkShards({
			'json/Acme.App.json': JSON.stringify({ strategy: 'static', state: { source: 'value' } }),
			'script/Acme.Shorthand.ts': 'return {\n\tversion,\n\tstate,\n};',
			'script/Acme.Property.Font.ts': 'return { version, state: id };',
			'script/Acme.Inline.ts': 'return { version, urls: () => [url], state };',
		});
		expect(messages(issues)).toEqual(
			Array(4).fill('shard returns state but has no version-state seed'),
		);
		expect(
			issues.flatMap((issue) => issue.hints ?? []).toSorted((a, b) => a.localeCompare(b)),
		).toEqual(
			['Acme.App', 'Acme.Inline', 'Acme.Property', 'Acme.Shorthand'].map(
				(id) => `add version-state/${id} with the state of the merged manifest`,
			),
		);
	});

	test('accepts seeded, stateless, and disabled shards', async () => {
		const issues = await checkShards(
			{
				'json/Acme.App.json': JSON.stringify({ state: { source: 'value' } }),
				'script/Acme.Font.Font.ts': 'return { version, state };',
				'json/Acme.Stateless.json': JSON.stringify({ strategy: 'static' }),
				'script/Acme.Argument.ts': 'const { groups } = match(state, /x/);\nreturn { version };',
				'json/Acme.Disabled.json.disabled': JSON.stringify({ state: { source: 'value' } }),
			},
			['Acme.App', 'Acme.Font'],
		);
		expect(issues).toHaveLength(0);
	});
});
