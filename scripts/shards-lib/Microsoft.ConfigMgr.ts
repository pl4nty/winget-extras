import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { isStateMatching, match } from 'anthelion/helpers';
import { $ } from 'bun';
import { zipSync } from 'fflate';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// ConfigMgr tools only ship in its install media. This link redirects to the evaluation media,
// ConfigMgr_<release>.exe, a 7-Zip SFX (~1.25 GB) whose SMSSETUP/TOOLS holds every tool.
const mediaLink = 'https://go.microsoft.com/fwlink/?linkid=2350307';

// Shared by every ConfigMgr shard in the run, so the media is downloaded once
let tools: Promise<string> | undefined;

function extractTools(url: string) {
	return (tools ??= (async () => {
		const dir = await mkdtemp(join(tmpdir(), 'configmgr-'));
		await Bun.write(join(dir, 'media.exe'), await ky(url, { timeout: 600_000, retry: 3 }));
		await $`7z x ${join(dir, 'media.exe')} -o${dir} SMSSETUP/TOOLS`.quiet();
		return join(dir, 'SMSSETUP', 'TOOLS');
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
	const { headers } = await ky.head(mediaLink, { redirect: 'manual', throwHttpErrors: false });
	const url = headers.get('location')!;
	const display = { source: 'display' } as const;
	if (await isStateMatching({ packageIdentifier, state: url })) {
		return { version: display, urls: () => [], state: url };
	}

	const dir = await extractTools(url);
	// MSIs carry their own version, so they're stored under the release, e.g. 2509
	const msi = fileName.endsWith('.msi');
	const version = msi ? match(url, /ConfigMgr_(\d+)\.exe$/).groups[0]! : await toolsVersion(dir);
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
		state: url,
	};
}
