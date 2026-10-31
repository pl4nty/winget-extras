import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { isStateMatching, match } from 'anthelion/helpers';
import { $ } from 'bun';
import { zipSync } from 'fflate';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// ConfigMgr tools only ship in its install media. The in-console update manifest links each
// release's payload cab, whose SMSSETUP/TOOLS holds every tool.
const manifestLink = 'https://go.microsoft.com/fwlink/?LinkId=2309745';

async function extract(url: string, ...paths: string[]) {
	const dir = await mkdtemp(join(tmpdir(), 'configmgr-'));
	await Bun.write(join(dir, 'download.cab'), await ky(url, { timeout: 600_000, retry: 3 }));
	await $`7z x ${join(dir, 'download.cab')} -o${dir} ${paths}`.quiet();
	return dir;
}

// Shared by every ConfigMgr shard in the run, so each cab is downloaded once
let release: Promise<{ name: string; payload: string }> | undefined;
let tools: Promise<string> | undefined;

/** Latest full release, e.g. 2609. Hotfixes are `Type` 2. */
function latestRelease() {
	return (release ??= (async () => {
		const manifest = await Bun.file(
			join(await extract(manifestLink, 'Manifest.xml'), 'Manifest.xml'),
		).text();
		return manifest
			.split('</ConfigurationManagerUpdate>')
			.filter((update) => update.includes('<Type>0</Type>'))
			.map((update) => ({
				name: match(update, /<Update>(\d+)<\/Update>/).groups[0]!,
				payload: match(update, /ContentUrl="([^"]+)"/).groups[0]!,
			}))
			.sort((a, b) => Number(b.name) - Number(a.name))[0]!;
	})());
}

/** Site build with hotfixes, e.g. 5.0.9141.1002. 7-Zip writes version.txt as UTF-16LE. */
async function toolsVersion(dir: string) {
	const info = new TextDecoder('utf-16le').decode(
		await $`7z e -so ${join(dir, 'CMTrace.exe')} .rsrc/version.txt`.arrayBuffer(),
	);
	return match(info, /FILEVERSION\s+(\d+),(\d+),(\d+),(\d+)/).groups.join('.');
}

/** Mirrors the file `globs` match as is, or zips them flat when `fileName` is a zip. */
export async function configMgrTool(packageIdentifier: string, fileName: string, globs: string[]) {
	const { name, payload } = await latestRelease();
	const display = { source: 'display' } as const;
	if (await isStateMatching({ packageIdentifier, state: name })) {
		return { version: display, urls: () => [], state: name };
	}

	const dir = join(await (tools ??= extract(payload, 'SMSSETUP/TOOLS')), 'SMSSETUP', 'TOOLS');
	// MSIs carry their own version, so they're stored under the release
	const msi = fileName.endsWith('.msi');
	const version = msi ? name : await toolsVersion(dir);
	const files = (
		await Promise.all(globs.map((glob) => Array.fromAsync(new Bun.Glob(glob).scan(dir))))
	)
		.flat()
		.map((path) => Bun.file(join(dir, path)));

	return {
		version: msi ? display : version,
		urls: async () => [
			await mirrorFile(packageIdentifier, version, fileName, async () =>
				!fileName.endsWith('.zip')
					? files[0]!
					: zipSync(
							Object.fromEntries(
								await Promise.all(
									files.map(async (file) => [basename(file.name!), await file.bytes()] as const),
								),
							),
						),
			),
		],
		state: name,
	};
}
