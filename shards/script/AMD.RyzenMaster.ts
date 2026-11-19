import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { headers, mirrorDriver } from '@/scripts/shards-lib/AMD';

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
			{ url: await mirrorDriver('AMD.RyzenMaster', version!, url!), architecture: 'x64' },
		],
	};
});
