import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { strFromU8, unzipSync } from 'fflate';
import ky from 'ky';

// komac has no version source for MSIX/APPX installers: `display` and `product`
// only read exe/msi metadata. The manifests of these packages use the appx
// Identity version, so shards for them read it from the package itself.

const repoRoot = resolve(import.meta.dir, '..', '..');
// Some of these packages are over 100 MB.
const request = { timeout: 300_000, retry: 3 };

function versionParts(version: string) {
	return version.split(/[.-]/).map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

function compareNugetVersions(a: string, b: string) {
	const partsA = versionParts(a);
	const partsB = versionParts(b);
	for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
		const partA = partsA[i];
		const partB = partsB[i];
		if (partA === partB) continue;
		if (partA === undefined) return -1;
		if (partB === undefined) return 1;
		if (typeof partA === 'number' && typeof partB === 'number') return partA - partB;
		return String(partA).localeCompare(String(partB));
	}
	return 0;
}

/** Greatest version in a NuGet flat container index that matches `line`. */
export async function latestNugetVersion(index: string, line: RegExp) {
	const { versions } = await ky(index, request).json<{ versions: string[] }>();
	const latest = versions
		.filter((version) => line.test(version))
		.sort(compareNugetVersions)
		.at(-1);
	if (!latest) {
		throw new Error(`No version in ${index} matches ${line}`);
	}
	return latest;
}

/** `Version` of the `Identity` element in an appx, without trailing zero segments. */
export function appxIdentityVersion(appx: Uint8Array) {
	const files = unzipSync(appx, { filter: (file) => file.name === 'AppxManifest.xml' });
	const manifest = files['AppxManifest.xml'];
	if (!manifest) {
		throw new Error('No AppxManifest.xml in the appx');
	}
	const version = /<Identity\b[^>]*\sVersion="([^"]+)"/i.exec(strFromU8(manifest))?.[1];
	if (!version) {
		throw new Error('No Identity Version in AppxManifest.xml');
	}
	return version.replace(/(\.0)+$/, '');
}

function appxVersionInNupkg(nupkg: Uint8Array, appx: RegExp) {
	const entries = unzipSync(nupkg, {
		filter: (file) => /\.(?:appx|msix)$/i.test(file.name) && appx.test(file.name),
	});
	const [name] = Object.keys(entries).sort();
	const entry = name ? entries[name] : undefined;
	if (!entry) {
		throw new Error(`No appx matching ${appx} in the nupkg`);
	}
	return appxIdentityVersion(entry);
}

// The nupkg of a version that is already in the repository is not downloaded
// again: its appx version is the name of the manifest directory that uses it.
async function manifestVersionUsing(manifests: string, nugetVersion: string) {
	const root = join(repoRoot, manifests);
	const needle = `.${nugetVersion}.nupkg`.toLowerCase();
	for (const entry of await readdir(root, { withFileTypes: true })) {
		if (!entry.isDirectory()) continue;
		const files = await readdir(join(root, entry.name));
		const installer = files.find((file) => file.endsWith('.installer.yaml'));
		if (!installer) continue;
		const text = await readFile(join(root, entry.name, installer), 'utf8');
		if (text.toLowerCase().includes(needle)) return entry.name;
	}
	return undefined;
}

/**
 * Newest nupkg of a frozen NuGet release line and the appx version inside it.
 * `manifests` is the package's manifest directory, `appx` picks the appx.
 */
export async function nugetAppxVersion(options: {
	index: string;
	line: RegExp;
	manifests: string;
	nupkg: (nugetVersion: string) => string;
	appx: RegExp;
}) {
	const nugetVersion = await latestNugetVersion(options.index, options.line);
	const known = await manifestVersionUsing(options.manifests, nugetVersion);
	if (known) {
		return { version: known, nugetVersion };
	}
	const nupkg = new Uint8Array(await ky(options.nupkg(nugetVersion), request).arrayBuffer());
	return { version: appxVersionInNupkg(nupkg, options.appx), nugetVersion };
}

/** Appx version of a directly downloadable appx. */
export async function appxVersionAt(url: string) {
	return appxIdentityVersion(new Uint8Array(await ky(url, request).arrayBuffer()));
}
