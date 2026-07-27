import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { firstMatch } from 'anthelion/helpers';

// Releases are tagged with the product version (v1.0.0) while the package is
// versioned by the bundle it ships (Windows.DevHome_0.2101.858.0.msixbundle),
// so read the version from the asset name and drop its trailing revision.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'microsoft', repo: 'WindowsAdvancedSettings' });
	const urls = release.urls().filter((url) => url.endsWith('.msixbundle'));
	if (urls.length !== 1) throw new Error('Expected exactly one msixbundle asset');

	return {
		version: firstMatch(
			urls[0] as string,
			/_(\d+(?:\.\d+){2})\.\d+\.msixbundle$/,
			'No version found in asset name',
		),
		urls: () => urls,
	};
});
