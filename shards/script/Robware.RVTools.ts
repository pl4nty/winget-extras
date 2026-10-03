import { readdir } from 'node:fs/promises';

import { defineShard } from 'anthelion';
import { compareVersions, match } from 'anthelion/helpers';
import ky from 'ky';

const base = 'https://downloads.dell.com/rvtools/';

// Dell's KB article and shop page 403 or stall CI runners behind Akamai, but the downloads CDN
// serves the RVTools manual, whose PDF title carries the version ("RVTools 4.8.2 ..."). Some CDN
// edges still serve an older manual, so never step back below the newest version already here.
export default defineShard(async () => {
	const pdf = await ky(`${base}rvtools.pdf`, { timeout: 60_000, retry: 3 }).text();
	const {
		groups: [latest],
	} = match(pdf, /\/Title\s*\(RVTools\s+(\d+(?:\.\d+)+)/);

	const existing = await readdir('manifests/r/Robware/RVTools').catch(() => []);
	const version = [latest!, ...existing].sort(compareVersions).at(-1)!;

	return { version, urls: () => [`${base}RVTools${version}.msi`] };
});
