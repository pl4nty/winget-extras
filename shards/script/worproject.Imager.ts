import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { match } from 'anthelion/helpers';

// dldserv-mirror tags each release with the mirror's upload date (e.g. 13%2F02%2F2024),
// not a package version, and a single release bundles assets for several worproject
// downloads (imager, boot mounter, etc). Find the imager zip by its filename and read
// the version out of the filename itself, since it's not exposed anywhere else on the
// release.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'worproject', repo: 'dldserv-mirror' });
	const urls = release.urls().filter((url) => /\/WoR_Release_[^/]+\.zip$/i.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one WoR_Release imager asset');

	const {
		groups: [version],
	} = match(urls[0]!, /WoR_Release_(\d+(?:\.\d+)+)\.zip$/i);

	return { version, urls: () => urls };
});
