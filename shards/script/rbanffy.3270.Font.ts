import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';

// Asset names embed a commit hash (e.g. 3270_fonts_d916271.zip), so take the
// asset straight from the release instead of templating the name.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'rbanffy', repo: '3270font' });
	const urls = release.urls().filter((url) => /\/3270_fonts_[^/]+\.zip$/.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one fonts asset');

	return { version: release.version, urls };
});
