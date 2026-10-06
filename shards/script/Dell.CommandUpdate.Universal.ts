import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 107174 is Dell Command | Update Windows Universal's component ID; the name excludes the ARM64 and pre-5.0 packages
	const { path, version } = await getLatestComponent(
		'107174',
		/Dell-Command-Update-Windows-Universal-Application_[^_]+_WIN64_/,
	);

	return { version, urls: () => [`https://dl.dell.com/${path}`] };
});
