import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { mirror } from '@/scripts/shards-lib/mirror';

// radiosky.com answers 403 to the Delivery Optimization agent komac downloads with
export default defineShard(async () => {
	const page = await ky('https://radiosky.com/skypipeishere.html').text();
	const {
		groups: [file, version],
	} = match(page, /(RSPII_Install_(\d+(?:_\d+)+)\.exe)/);

	const dotted = version!.replaceAll('_', '.');
	return {
		version: dotted,
		urls: async () => [
			await mirror('RadioSky.SkyPipe', dotted, `https://radiosky.com/skypipe/${file}`),
		],
	};
});
