import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The installer's version is independent of the release folder it is filed under
// (5.2.2.0 currently sits in the 5.6.0.0 folder), so read both from the project feed.
export default defineShard(async () => {
	const feed = await ky(
		'https://sourceforge.net/projects/wmrx00/rss?path=/1.%20Windows%20Install',
		{
			timeout: 60_000,
			retry: 3,
		},
	).text();

	const {
		groups: [folder, version],
	} = match(feed, /\/1\. Windows Install\/([^/]+)\/WSDL-SteamGauge-(\d+(?:\.\d+)+)-Installer\.exe/);

	return {
		version,
		urls: () => [
			`https://sourceforge.net/projects/wmrx00/files/1.%20Windows%20Install/${folder}/WSDL-SteamGauge-${version}-Installer.exe/download`,
		],
	};
});
