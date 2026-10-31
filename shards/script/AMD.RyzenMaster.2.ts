import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { extractRyzenMasterInstaller } from '@/scripts/shards-lib/AMD';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

// Tracks the Ryzen 3000-4000 branch (2.14). drivers.amd.com only serves it with an amd.com
// Referer, and the vendor setup needs C:\AMD, so mirror the inner installer instead
// amd.com drops connections with Bun's default User-Agent, so send a plain one
const headers = { 'User-Agent': 'winget-extras' };

export default defineShard(async () => {
	const page = await ky('https://www.amd.com/en/products/software/ryzen-master.html', {
		headers,
	}).text();
	const {
		groups: [url, version],
	} = match(page, /(https:\/\/drivers\.amd\.com\/drivers\/amd_ryzen_master_(2\.[\d.]+)\.exe)/);

	return {
		version: version!,
		urls: async () => [
			await mirrorFile(
				'AMD.RyzenMaster.2',
				version!,
				`amd_ryzen_master_ui_${version}.exe`,
				async () =>
					extractRyzenMasterInstaller(
						await ky(url!, {
							headers: { ...headers, Referer: 'https://www.amd.com/' },
							timeout: 300_000,
							retry: 3,
						}).bytes(),
					),
			),
		],
	};
});
