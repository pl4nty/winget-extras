import { defineShard } from 'anthelion';
import { compareVersions, match } from 'anthelion/helpers';
import ky from 'ky';

// www.lyx.org/Download times out from GitHub runners, so read LyX's own download mirror instead.
// Each release has a directory under bin/ holding its Windows installer.
const mirror = 'https://lyx.mirror.garr.it/bin/';

export default defineShard(async () => {
	const listing = await ky(mirror, { timeout: 60_000 }).text();
	const version = [...listing.matchAll(/href="(\d+(?:\.\d+)+)\/"/g)]
		.map(([, version]) => version!)
		.sort(compareVersions)
		.at(-1);
	if (!version) {
		throw new Error('No LyX release directory found');
	}

	const release = await ky(`${mirror}${version}/`, { timeout: 60_000 }).text();
	const installer = match(release, /href="(LyX-\d+-Installer-\d+-x64\.exe)"/).groups[0];
	const urls = () => [`${mirror}${version}/${installer}`];
	return { version, urls };
});
