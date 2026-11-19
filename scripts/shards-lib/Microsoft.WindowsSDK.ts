import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { compareVersions } from 'anthelion/helpers';
import { $ } from 'bun';
import ky from 'ky';

// Some SDK tools only ship in the SDK ISO (~1.2 GB, UDF only), which the SDK archive links per release.

const request = { timeout: 600_000, retry: 3 };

export async function getLatestSdk() {
	const page = await ky(
		'https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/',
		request,
	).text();
	const [latest] = Array.from(
		page.matchAll(
			/Windows SDK for Windows 1[01][^(<]*\((10\.0\.\d+\.\d+)\)(?:(?!Windows SDK for Windows)[\s\S])*?<a href="([^"]+)"[^>]*>ISO</g,
		),
		([, version, iso]) => ({ version: version!, iso: iso! }),
	).sort((a, b) => compareVersions(b.version, a.version));
	if (!latest) {
		throw new Error('No Windows SDK releases found');
	}
	return latest;
}

/** Files from the ISO's Installers folder, keyed by name. */
export async function extractInstallers(iso: string, names: string[]) {
	const dir = await mkdtemp(join(tmpdir(), 'windows-sdk-'));
	await Bun.write(join(dir, 'sdk.iso'), await ky(iso, request));
	await $`7z e ${join(dir, 'sdk.iso')} -o${dir} ${names.map((name) => `Installers/${name}`)}`.quiet();
	return new Map(names.map((name) => [name, Bun.file(join(dir, name))]));
}
