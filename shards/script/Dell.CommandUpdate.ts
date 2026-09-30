import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 23400 is Dell Command | Update's component ID; the name excludes the ARM64 and pre-3.0 32-bit packages
	const { path, version } = await getLatestComponent(
		'23400',
		/Dell-Command-Update-(?:Application|for-Win32)_[^_]+_WIN64_/,
	);

	return { version, urls: () => [`https://dl.dell.com/${path}`] };
});
