import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';
// LyX's download page regularly exceeds ky's default ten-second timeout.
export default defineShard(async () => {
	const page = await ky('https://www.lyx.org/Download', { timeout: 60_000, retry: 3 }).text();
	const {
		groups: [url, version],
	} = match(
		page,
		/(https:\/\/lyx\.mirror\.garr\.it\/bin\/(\d+(?:\.\d+)+)\/LyX-\d+-Installer-\d+-x64\.exe)/,
	);
	const urls = () => [url];
	return { version, urls };
});
