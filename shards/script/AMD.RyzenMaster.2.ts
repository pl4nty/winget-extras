import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// Tracks the Ryzen 3000-4000 branch (2.14). drivers.amd.com only serves it with an amd.com
// Referer, so mirror it. amd.com drops connections with Bun's default User-Agent
const headers = { 'User-Agent': 'winget-extras' };

export default defineShard(async () => {
	const page = await ky('https://www.amd.com/en/products/software/ryzen-master.html', {
		headers,
	}).text();
	const {
		groups: [url, file, version],
	} = match(page, /(https:\/\/drivers\.amd\.com\/drivers\/(amd_ryzen_master_(2\.[\d.]+)\.exe))/);
	const {
		groups: [releaseNotesUrl],
	} = match(page, /href="([^"]*RN-RYZEN-MASTER-2-14[^"]*)"/);

	return {
		version: version!,
		urls: async () => [
			{
				// The setup is a 32-bit stub that installs a 64-bit app
				architecture: 'x64',
				url: await mirrorFile('AMD.RyzenMaster.2', version!, file!, () =>
					ky(url!, {
						headers: { ...headers, Referer: 'https://www.amd.com/' },
						timeout: 300_000,
						retry: 3,
					}),
				),
			},
		],
		releaseNotes: {
			releaseNotesUrl: new URL(releaseNotesUrl!, 'https://www.amd.com').href,
		},
	};
});
