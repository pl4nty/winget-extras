import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Plain page-match, except nmap.org is slow enough to blow ky's ten second
// default from CI. A JSON shard cannot extend it, so match the page here.
const PAGE = 'https://nmap.org/download.html';
const VERSION = /dist\/nmap-(\d+(?:\.\d+)+)-setup\.exe/;
const REQUEST = { timeout: 60_000, retry: 3 };

export default defineShard(async () => {
	const page = await ky(PAGE, REQUEST).text();
	const version = firstMatch(page, VERSION, 'No Nmap installer on the download page');

	return {
		version,
		urls: () => [{ url: `https://nmap.org/dist/nmap-${version}-setup.exe`, architecture: 'x86' }],
	};
});
