import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The version history page 403s for any browser-like User-Agent (Akamai bot
// protection) but allows non-browser clients through, so spoof a plain one.
export default defineShard(async () => {
	const html = await ky('https://www.ldplayer.net/other/version-history-and-release-notes.html', {
		headers: { 'User-Agent': 'curl/8.0' },
	}).text();

	const {
		groups: [version, url],
	} = match(
		html,
		new RegExp(
			String.raw`\\"versionFourteen\\":\{\\"records\\":\[\{\\"version\\":\\"(?<version>\d+(?:\.\d+)+)\\",\\"releaseDate\\":\\"[\d-]+\\",\\"link\\":\\"(?<url>https://[^"\\]+\.exe)\\"`,
		),
	);

	return { version, urls: () => [`${url}`] };
});
