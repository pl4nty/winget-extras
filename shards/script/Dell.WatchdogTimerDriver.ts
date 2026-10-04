import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 109566 is the Dell Watchdog Timer component the KDC02 package ships under; it also lists older Application packages
	const { path, version } = await getLatestComponent(
		'109566',
		/Dell-Watchdog-Timer-(?:Driver|Application)_[^_]+_WIN64_/,
	);

	return { version, urls: () => [`https://dl.dell.com/${path}`] };
});
