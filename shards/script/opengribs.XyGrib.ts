import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';

// Installer names track the feature release (v1.2.6) while the tag can carry an
// extra patch component (v1.2.6.1), so take the Windows offline installer
// straight from the release instead of templating the name.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'opengribs', repo: 'XyGrib' });
	const urls = release
		.urls()
		.filter((url) => /\/XyGrib_Win_Offline_Installer_[^/]+\.exe$/.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one Windows offline installer asset');

	return { version: release.version, urls: () => urls };
});
