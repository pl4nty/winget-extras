import { defineShard } from 'anthelion';

import { getReleases } from '@/scripts/shards-lib/qualcomm-software-center';

export default defineShard(async () => {
	const releases = await getReleases('Snapdragon_ESRT');
	const latest = releases.find(
		(release) =>
			release.releaseBranch === 'Production' &&
			release.targetOperatingSystem === 'Windows' &&
			release.file?.downloadLink,
	)!;

	// The catalog carries a four-part file version (1.0.4.0) while the release is
	// named with three (1.0.4).
	const version = latest.version.replace(/\.0$/, '');
	const urls = () => [latest.file!.downloadLink];

	return { version, urls };
});
