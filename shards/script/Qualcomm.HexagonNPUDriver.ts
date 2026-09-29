import { defineShard } from 'anthelion';

import { getLatestRelease } from '@/scripts/shards-lib/qualcomm-software-center';

export default defineShard(async () => {
	const { version, urls } = await getLatestRelease('Qualcomm_HND', 'Windows');

	return { version, urls: () => urls };
});
