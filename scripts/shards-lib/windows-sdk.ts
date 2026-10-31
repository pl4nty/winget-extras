import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compareVersions } from 'anthelion/helpers';
import { $ } from 'bun';
import ky from 'ky';

// Some SDK tools only ship inside the SDK ISO (~1.2 GB, UDF only). The SDK archive lists every
// release with its ISO link.

export async function getLatestSdk() {
	const page = await ky('https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/', {
		timeout: 30_000,
		retry: 3,
	}).text();
	const releases = Array.from(
		page.matchAll(
			/Windows SDK for Windows 1[01][^(<]*\((10\.0\.\d+\.\d+)\)(?:(?!Windows SDK for Windows)[\s\S])*?<a href="([^"]+)"[^>]*>ISO</g,
		),
		([, version, iso]) => ({ version: version!, iso: iso! }),
	).sort((a, b) => compareVersions(b.version, a.version));
	const latest = releases[0];
	if (!latest) {
		throw new Error('No Windows SDK releases found');
	}
	return latest;
}

/** Files from the ISO's Installers folder, keyed by name. Uses the runner's 7-Zip for UDF. */
export async function extractInstallers(iso: string, names: string[]) {
	const dir = await mkdtemp(join(tmpdir(), 'windows-sdk-'));
	const path = join(dir, 'sdk.iso');
	await Bun.write(path, await ky(iso, { timeout: 600_000, retry: 3 }));
	await $`7z e ${path} -o${join(dir, 'out')} ${names.map((name) => `Installers/${name}`)}`.quiet();
	return new Map(names.map((name) => [name, Bun.file(join(dir, 'out', name))]));
}
