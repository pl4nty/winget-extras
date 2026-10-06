import { defineShard } from 'anthelion';

import { getLatestComponent } from '@/scripts/shards-lib/dell-catalog';

export default defineShard(async () => {
	// 1517 is Dell Command | Monitor's x64 component ID and 113782 its ARM64 one; fewer model
	// catalogs list the ARM64 package, so read more of them
	const [x64, arm64] = await Promise.all([
		getLatestComponent('1517', /Dell-Command-Monitor_[^_]+_WIN64_/),
		getLatestComponent('113782', /Dell-Command-Monitor_[^_]+_WINARM64_/, 100),
	]);
	if (x64.version !== arm64.version) {
		throw new Error(`x64 ${x64.version} and ARM64 ${arm64.version} versions differ`);
	}

	return {
		version: x64.version,
		urls: () => [`https://dl.dell.com/${x64.path}`, `https://dl.dell.com/${arm64.path}`],
	};
});
