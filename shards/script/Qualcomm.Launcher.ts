import { defineShard } from 'anthelion';

import { getLatestRelease } from '@/scripts/shards/qualcomm-software-center';

export default defineShard(async () => {
	const { version, urls } = await getLatestRelease('Qualcomm_Launcher', 'Windows');

	return { version, urls: () => urls };
});
