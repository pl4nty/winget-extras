import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { driverHeaders, extractRyzenMasterInstaller, headers } from '@/scripts/shards-lib/AMD';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

export default defineShard(async () => {
	const page = await ky('https://www.amd.com/en/products/software/ryzen-master.html', {
		headers,
	}).text();
	const {
		groups: [url, version],
	} = match(page, /(https:\/\/drivers\.amd\.com\/drivers\/amd_ryzen_master_(3\.[\d.]+)\.exe)/);

	return {
		version: version!,
		urls: async () => [
			{
				url: await mirrorFile(
					'AMD.RyzenMaster',
					version!,
					`amd_ryzen_master_ui_${version}.exe`,
					async () =>
						extractRyzenMasterInstaller(
							await ky(url!, { headers: driverHeaders, timeout: 300_000, retry: 3 }).bytes(),
						),
				),
				architecture: 'x64',
			},
		],
	};
});
