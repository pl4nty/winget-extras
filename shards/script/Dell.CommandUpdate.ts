import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 23400 is Dell Command | Update's component ID; x64 excludes the pre-3.0 32-bit packages
	const { path, version } = await getLatestComponent('23400', /_WIN64_/);

	return { version, urls: () => [`https://dl.dell.com/${path}`] };
});
