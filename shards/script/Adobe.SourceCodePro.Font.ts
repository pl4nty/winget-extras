import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { match } from 'anthelion/helpers';

// Release tags contain slashes (e.g. 2.042R-u/1.062R-i/1.026R-vf), so take the
// TTF asset straight from the release and parse the upright version from it.
export default defineShard(async () => {
	const release = await getLatestRelease({
		owner: 'adobe-fonts',
		repo: 'source-code-pro',
	});

	const version = match(release.rawTag, /^(\d+(?:\.\d+)+)R/).groups[0];
	const urls = () => release.urls().filter((url) => /\/TTF-source-code-pro-[^/]+\.zip$/.test(url));

	return {
		version,
		urls,
	};
});
