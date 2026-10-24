import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 107174 is Dell Command | Update for Windows Universal's component ID; the name excludes ARM64
	const { path, version } = await getLatestComponent(
		'107174',
		/Windows-Universal-Application_[^_]+_WIN64_/,
	);

	return { version, urls: () => [`https://dl.dell.com/${path}`] };
});
