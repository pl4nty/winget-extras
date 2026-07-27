import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Plain page-match, except npcap.com is slow enough to blow ky's ten second
// default from CI. A JSON shard cannot extend it, so match the page here.
const PAGE = 'https://npcap.com/';
const VERSION = /dist\/npcap-(\d+(?:\.\d+)+)\.exe/;
const REQUEST = { timeout: 60_000, retry: 3 };

export default defineShard(async () => {
	const page = await ky(PAGE, REQUEST).text();
	const version = firstMatch(page, VERSION, 'No Npcap installer on the download page');

	return {
		version,
		urls: [`https://npcap.com/dist/npcap-${version}.exe|x86`],
	};
});
