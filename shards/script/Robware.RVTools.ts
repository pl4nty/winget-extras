import { defineShard } from 'anthelion';
import ky from 'ky';

// Dell's KB article is the only first-party version source, but its Akamai 403s or stalls
// requests from CI runners. The Chocolatey package tracks the same Dell MSI, so read its version.
export default defineShard(async () => {
	const feed = await ky(
		"https://community.chocolatey.org/api/v2/Packages()?$filter=Id eq 'rvtools' and IsLatestVersion&$select=Version",
	).text();
	const version = /<d:Version>([^<]+)<\/d:Version>/.exec(feed)?.[1];
	if (!version) {
		throw new Error('No RVTools version found in the Chocolatey feed');
	}

	return { version, urls: () => [`https://downloads.dell.com/rvtools/RVTools${version}.msi`] };
});
