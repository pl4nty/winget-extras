import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import { isStateMatching, match } from 'anthelion/helpers';
import { $ } from 'bun';
import { zipSync } from 'fflate';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// The Configuration Manager tools only ship in its install media. The evaluation media is a 7-Zip
// SFX (~1.25 GB) behind a link that redirects to ConfigMgr_<release>.exe, and its SMSSETUP/TOOLS
// folder holds every tool these packages carry.
const mediaLink = 'https://go.microsoft.com/fwlink/?linkid=2350307';

let media: Promise<{ tools: string; version: string }> | undefined;

// Shared by every ConfigMgr shard in the run, so the media is downloaded once
function extractTools(url: string) {
	media ??= (async () => {
		const dir = await mkdtemp(join(tmpdir(), 'configmgr-'));
		const exe = join(dir, 'media.exe');
		await Bun.write(exe, await ky(url, { timeout: 600_000, retry: 3 }));
		await $`7z x ${exe} -o${dir} SMSSETUP/TOOLS`.quiet();
		const tools = join(dir, 'SMSSETUP', 'TOOLS');
		// The tools carry the site build with hotfixes, e.g. 5.0.9141.1002
		const info = await $`7z e -so ${join(tools, 'CMTrace.exe')} .rsrc/version.txt`.text();
		const {
			groups: [version],
		} = match(
			info,
			/FileVersion:\s*(\d+\.\d+\.\d+\.\d+)/,
			`No FileVersion in CMTrace.exe (${await $`ls -la ${tools}`.nothrow().text()}): ${info.slice(0, 800)}`,
		);
		return { tools, version: version! };
	})();
	return media;
}

/**
 * Shard result for a tool from the media's SMSSETUP/TOOLS. A single path whose name is `fileName`
 * is mirrored as is, anything else is zipped flat. MSIs carry their own version
 * (5.2509.1036.1000), so they are mirrored under the release name and komac reads the version.
 */
export async function configMgrTool(packageIdentifier: string, fileName: string, paths: string[]) {
	const { headers } = await ky.head(mediaLink, { redirect: 'manual', throwHttpErrors: false });
	const url = headers.get('location');
	if (!url) {
		throw new Error(`${mediaLink} did not redirect to the media`);
	}
	const msi = fileName.endsWith('.msi');
	const product = { source: 'product' } as const;

	// Skip the download while the media is unchanged
	if (await isStateMatching({ packageIdentifier, state: url })) {
		return { version: product, urls: () => [], state: url };
	}

	const { tools, version } = await extractTools(url);
	const {
		groups: [release],
	} = match(url, /ConfigMgr_(\d+)\.exe$/);
	const files = paths.map((path) => Bun.file(join(tools, path)));

	return {
		version: msi ? product : version,
		urls: async () => [
			await mirrorFile(packageIdentifier, msi ? release! : version, fileName, async () =>
				files.length === 1 && basename(paths[0]!) === fileName
					? files[0]!
					: zipSync(
							Object.fromEntries(
								await Promise.all(
									files.map(async (file, i) => [basename(paths[i]!), await file.bytes()]),
								),
							),
						),
			),
		],
		state: url,
	};
}
