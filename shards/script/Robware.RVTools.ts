import { defineShard } from 'anthelion';
import ky from 'ky';

// Dell's Akamai 403s requests to this KB article that lack a browser User-Agent and Accept-Language.
export default defineShard(async () => {
	const page = await ky('https://www.dell.com/support/kbdoc/en-us/000325532', {
		headers: {
			'User-Agent':
				'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
			Accept: 'text/html,application/xhtml+xml',
			'Accept-Language': 'en-US,en;q=0.9',
		},
	}).text();
	const version = /rvtools(\d+(?:\.\d+)+)\.msi/i.exec(page)?.[1];
	if (!version) {
		throw new Error('No RVTools installer link found');
	}

	return { version, urls: () => [`https://downloads.dell.com/rvtools/RVTools${version}.msi`] };
});
