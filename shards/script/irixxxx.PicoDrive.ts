import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';

// Each build's filename embeds a short commit hash that changes unpredictably
// between releases (e.g. PicoDrive-win32-2.05-7cbcd41.zip), so filter
// release.urls() for the win32 zip instead of templating the URL.
export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'irixxxx', repo: 'picodrive' });
	const urls = release
		.urls()
		.filter((url) => /\/PicoDrive-win32-[\d.]+-[0-9a-f]{7}\.zip$/.test(url));
	if (urls.length !== 1) throw new Error('Expected exactly one Windows win32 zip asset');

	return { version: release.version, urls: () => urls };
});
