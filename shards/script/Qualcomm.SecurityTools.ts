import { defineShard } from 'anthelion';

import { getLatestRelease } from '@/scripts/shards/qualcomm-software-center';

export default defineShard(async () => {
	// Every platform ships inside one archive, so the catalog targets `All` rather
	// than Windows.
	const { version, urls } = await getLatestRelease('Qualcomm_Security_Tools', 'All');

	return { version, urls: () => urls };
});
