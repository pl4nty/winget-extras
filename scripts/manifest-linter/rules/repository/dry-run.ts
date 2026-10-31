import { readFile } from 'node:fs/promises';

import { parseYaml } from '@unownplain/anthelion-komac';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

type Leaf = string | number | boolean | null | undefined;

function flatten(value: unknown, path = '', fields = new Map<string, Leaf>()) {
	if (value && typeof value === 'object') {
		for (const [key, child] of Object.entries(value)) {
			flatten(
				child,
				Array.isArray(value) ? `${path}[${key}]` : path ? `${path}.${key}` : key,
				fields,
			);
		}
	} else {
		fields.set(path, value as Leaf);
	}
	return fields;
}

// `bun test:shard --dry-run` regenerates manifests from the committed ones
// (komac reads KOMAC_GITHUB_REF) and lists each one by path in the step
// summary, so any difference is a change the next automated update would make.
// Opt-in only: DRY_RUN_SUMMARY names that summary. Drift is reported as warnings.
export const dryRunRule = defineRule({
	id: 'repository/dry-run',
	async check({ records, report }) {
		const summary = await readFile(process.env.DRY_RUN_SUMMARY!, 'utf8');
		const committed = new Map(records.map((record) => [record.file, record]));

		for (const [, file, yaml] of summary.matchAll(/^#### (.+)\n\n```yaml\n([\s\S]*?)\n```$/gm)) {
			const record = committed.get(file!);
			if (!record) {
				report({
					file: file!,
					level: 'warning',
					message: 'shard dry run generates this manifest, but it is not committed',
				});
				continue;
			}

			const expected = flatten(parseYaml(record.raw));
			const actual = flatten(parseYaml(yaml!));
			for (const path of new Set([...expected.keys(), ...actual.keys()])) {
				// komac reorders tags, and tags never affect installs, so they are not drift.
				if (/^Tags(\[|$)/.test(path)) continue;
				const [before, after] = [expected.get(path), actual.get(path)];
				if (before === after) continue;
				report({
					file: record.file,
					level: 'warning',
					message: `${path} is ${JSON.stringify(before)}, shard dry run has ${JSON.stringify(after)}`,
					// The committed value points at the right line when keys repeat across installers.
					search: before === undefined ? /(\w+)(\[\d+\])*$/.exec(path)?.[1] : String(before),
				});
			}
		}
	},
});
