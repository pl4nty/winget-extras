import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';

// Asset names carry their own release-candidate and date suffixes (e.g.
// opendyslexic-0.910.12-rc2-2019.10.17.zip), so take the font archive straight
// from the release instead of templating the name. The release also ships a
// changelog text file, which must not become an installer. Every release is
// flagged as a prerelease, so `kind` cannot be left at its `stable` default.
export default defineShard(async () => {
	const release = await getLatestRelease({
		owner: 'antijingoist',
		repo: 'opendyslexic',
		kind: 'all',
	});
	const urls = release.urls().filter((url) => /\/opendyslexic-[^/]+\.zip$/.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one font archive asset');

	return { version: release.version, urls };
});
