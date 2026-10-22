import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { parseYaml } from '@unownplain/anthelion-komac';

// Compares the manifests that `bun test:shard --dry-run` prints with the
// manifests committed for the same version. The dry run regenerates them from
// the committed ones (komac reads KOMAC_GITHUB_REF), so any difference is
// something the next automated update would change.
//
// usage: bun test:shard <ids> --dry-run | tee dry-run.log
//        CHANGED_MANIFESTS='["manifests/..."]' bun scripts/check-dry-run.ts dry-run.log

const logFile = process.argv[2];
if (!logFile) {
	throw new Error('usage: bun scripts/check-dry-run.ts <dry-run log>');
}

type Manifest = Record<string, unknown>;

// Manifest files changed by the pull request, if any.
const changedManifests: string[] = JSON.parse(process.env.CHANGED_MANIFESTS || '[]');

const ansi = /\x1b\[[0-9;]*m/g;
const header = /^# Created by Anthelion.*$/m;

const exists = (path: string) =>
	stat(path).then(
		() => true,
		() => false,
	);

function packagePath(root: string, identifier: string) {
	return join(root, identifier[0]!.toLowerCase(), ...identifier.split('.'));
}

function manifestFile(identifier: string, manifest: Manifest) {
	switch (manifest.ManifestType) {
		case 'version':
			return `${identifier}.yaml`;
		case 'installer':
			return `${identifier}.installer.yaml`;
		default:
			return `${identifier}.locale.${String(manifest.PackageLocale)}.yaml`;
	}
}

function diff(expected: unknown, actual: unknown, path = ''): string[] {
	if (isDeepStrictEqual(expected, actual)) return [];
	if (Array.isArray(expected) && Array.isArray(actual)) {
		const length = Math.max(expected.length, actual.length);
		return Array.from({ length }, (_, i) => diff(expected[i], actual[i], `${path}[${i}]`)).flat();
	}
	if (
		expected &&
		actual &&
		typeof expected === 'object' &&
		typeof actual === 'object' &&
		!Array.isArray(expected) &&
		!Array.isArray(actual)
	) {
		const keys = new Set([...Object.keys(expected), ...Object.keys(actual)]);
		return [...keys].flatMap((key) =>
			diff((expected as Manifest)[key], (actual as Manifest)[key], path ? `${path}.${key}` : key),
		);
	}
	return [`${path || '<root>'}: ${JSON.stringify(expected)} -> ${JSON.stringify(actual)}`];
}

// Each shard prints its manifests between "URLs:" and "Pull request URL:".
const log = (await readFile(logFile, 'utf8')).replaceAll(ansi, '');
const runs = [...log.matchAll(/^URLs: .*$([\s\S]*?)^Pull request URL: /gm)].map((match) =>
	match[1]!
		.split(header)
		.map((text) => text.trim())
		.filter(Boolean),
);

let errors = 0;
let warnings = 0;

for (const documents of runs) {
	const generated = documents.map((text) => ({
		text,
		manifest: parseYaml(text) as Manifest,
	}));
	const first = generated[0]!.text;
	// Read as text: YAML parsing turns versions like 1.10 into numbers.
	const identifier = /^PackageIdentifier:\s*(\S+)/m.exec(first)![1]!;
	const version = /^PackageVersion:\s*(.+?)\s*$/m.exec(first)![1]!.replace(/^(['"])(.*)\1$/, '$2');

	const manifestRoot = packagePath('manifests', identifier);
	const packageRoot = (await exists(manifestRoot))
		? manifestRoot
		: packagePath('fonts', identifier);
	const versionRoot = join(packageRoot, version);

	if (!(await exists(versionRoot))) {
		if (
			(await exists(packageRoot)) &&
			!changedManifests.some((file) => file.startsWith(`${packageRoot}/`))
		) {
			// Manifests are untouched and the vendor has moved on. Not drift.
			console.log(`::warning::${identifier}: dry run found ${version}, not in ${packageRoot}`);
			warnings++;
		} else {
			console.log(
				`::error::${identifier}: dry run found version ${version}, but this pull request has no manifests for it. Make PackageVersion match the shard.`,
			);
			errors++;
		}
		continue;
	}

	const files = generated.map(({ manifest }) => manifestFile(identifier, manifest));
	for (const file of await readdir(versionRoot)) {
		if (!files.includes(file)) {
			console.log(
				`::error file=${join(versionRoot, file)}::${identifier}: dry run did not generate ${file}`,
			);
			errors++;
		}
	}

	for (const [i, { manifest }] of generated.entries()) {
		const file = join(versionRoot, files[i]!);
		if (!(await exists(file))) {
			console.log(
				`::error file=${file}::${identifier}: dry run generated ${file}, which is missing`,
			);
			errors++;
			continue;
		}
		const committed = parseYaml(await readFile(file, 'utf8'));
		const changes = diff(committed, manifest);
		if (changes.length) {
			console.log(
				`::error file=${file}::${identifier}: dry run differs from committed manifest%0A${changes.join('%0A')}`,
			);
			errors++;
		}
	}
}

console.log(`Checked ${runs.length} dry runs: ${errors} errors, ${warnings} warnings`);
if (errors) process.exit(1);
