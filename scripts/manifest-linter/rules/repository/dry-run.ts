import { readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stripVTControlCharacters } from 'node:util';

import { parseYaml } from '@unownplain/anthelion-komac';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

type Fields = Record<string, unknown>;
type Leaf = string | number | boolean | null | undefined;

// `bun test:shard --dry-run` regenerates manifests from the committed ones
// (komac reads KOMAC_GITHUB_REF), so any difference is a change the next
// automated update would make. Each shard prints its manifests between
// "URLs:" and "Pull request URL:".
function dryRuns(log: string): Fields[][] {
	return [
		...stripVTControlCharacters(log).matchAll(/^URLs: .*$([\s\S]*?)^Pull request URL: /gm),
	].map(([, output]) =>
		output!
			.split(/^# Created by Anthelion.*$/m)
			.filter((text) => text.trim())
			.map((text) => parseYaml(text) as Fields),
	);
}

function manifestKey(manifest: Fields): string {
	return [manifest.PackageVersion, manifest.ManifestType, manifest.PackageLocale].join(' ');
}

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

export const dryRunRule = defineRule({
	id: 'repository/dry-run',
	async check({ records, report }) {
		if (!process.env.DRY_RUN_LOG) return;
		const log = await readFile(process.env.DRY_RUN_LOG, 'utf8');
		const changed: string[] = JSON.parse(process.env.CHANGED_MANIFESTS || '[]');

		for (const generated of dryRuns(log)) {
			const [first] = generated;
			const packageRecords = records
				.filter(({ manifest }) => manifest.PackageIdentifier === first?.PackageIdentifier)
				.map((record) => ({ ...record, fields: parseYaml(record.raw) as Fields }));
			const versionRecords = packageRecords.filter(
				({ fields }) => fields.PackageVersion === first?.PackageVersion,
			);
			const committed = new Map(
				versionRecords.map((record) => [manifestKey(record.fields), record]),
			);

			if (!versionRecords.length) {
				// Untouched manifests while the vendor moved on is an update, not drift.
				const packageDirectory = dirname(packageRecords[0]?.directory ?? '');
				const touched = changed.some((file) => file.startsWith(`${packageDirectory}/`));
				report({
					file: packageDirectory,
					level: touched ? 'error' : 'warning',
					message: `shard dry run found version ${String(first?.PackageVersion)}, which has no manifests`,
					hints: touched ? ['make PackageVersion match the version the shard finds'] : [],
				});
				continue;
			}

			const keys = new Set(generated.map(manifestKey));
			for (const { file, fields } of versionRecords) {
				if (keys.has(manifestKey(fields))) continue;
				report({ file, message: 'shard dry run does not generate this manifest' });
			}

			for (const manifest of generated) {
				const record = committed.get(manifestKey(manifest));
				if (!record) {
					report({
						file: versionRecords[0]!.directory,
						message: `shard dry run generates a ${String(manifest.ManifestType)} manifest that is missing here`,
					});
					continue;
				}
				const expected = flatten(record.fields);
				const actual = flatten(manifest);
				for (const path of new Set([...expected.keys(), ...actual.keys()])) {
					const [before, after] = [expected.get(path), actual.get(path)];
					if (before === after) continue;
					report({
						file: record.file,
						message: `${path} is ${JSON.stringify(before)}, shard dry run has ${JSON.stringify(after)}`,
						// The committed value points at the right line when keys repeat across installers.
						search: before === undefined ? /(\w+)(\[\d+\])*$/.exec(path)?.[1] : String(before),
					});
				}
			}
		}
	},
});
