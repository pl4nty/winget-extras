import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { match } from 'anthelion/helpers';

// Upstream tags use dates, while package versions use the patch-release number.
export default defineShard(async () => {
	const release = await getLatestRelease({
		owner: 'ros2',
		repo: 'ros2',
		tagIncludes: 'release-lyrical-',
	});

	const {
		groups: [patch],
	} = match(release.title ?? '', /Lyrical Luth - Patch Release (\d+)/i);
	const version = `1.${patch}`;
	const urls = () => release.urls().filter((url) => /-windows-AMD64\.zip(?:\.zip)?$/.test(url));

	return {
		version,
		urls,
	};
});
