import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { firstMatch } from 'anthelion/helpers';

// Release tags contain slashes (e.g. 2.042R-u/1.062R-i/1.026R-vf), so take the
// TTF asset straight from the release and parse the upright version from it.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'adobe-fonts', repo: 'source-code-pro' });
	const urls = release.urls().filter((url) => /\/TTF-source-code-pro-[^/]+\.zip$/.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one TTF asset');

	return {
		version: firstMatch(release.rawTag, /^(\d+(?:\.\d+)+)R/, 'No version found in release tag'),
		urls,
	};
});
