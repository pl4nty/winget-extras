import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// versions.xml is cFosSpeed's own update feed. The download is a WordPress Download Manager
// package whose wpdmdl id is only listed on that release's page.
export default defineShard(async () => {
	const xml = await ky('https://atlas-cfosspeed.com/ml/versions.xml').text();
	const {
		groups: [major, minor, build],
	} = match(
		xml,
		/<cfosspeed>\s*<release>\s*<x86 version="(?<major>\d+)\.(?<minor>\d+)" build="(?<build>\d+)"/i,
	);

	const slug = `cfosspeed-v${major}-${minor}-${build}`;
	const page = await ky(`https://atlas-cfosspeed.com/download/${slug}/`).text();
	const id = match(page, new RegExp(`download/${slug}/\\?wpdmdl=(\\d+)`, 'i')).groups[0];

	return {
		version: `${major}.${minor}.${build}`,
		urls: () => [`https://atlas-cfosspeed.com/download/${slug}/?wpdmdl=${id}`],
	};
});
