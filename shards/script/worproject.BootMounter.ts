import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { match } from 'anthelion/helpers';

export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'worproject', repo: 'dldserv-mirror' });
	const urls = release.urls().filter((url) => url.includes('WoR-Boot-Mounter_Release'));

	const {
		groups: [version],
	} = match(urls[0]!, /WoR-Boot-Mounter_Release_(\d+(?:\.\d+)+)\.zip$/i);

	return { version, urls: () => urls };
});
