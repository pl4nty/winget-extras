import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Qualcomm Software Center renders its catalog client-side and its product API
// requires an account, so the only public place the current download appears is
// the Snapdragon enterprise site, which hardcodes the URL in its bundle. The
// bundle name carries a build hash, so read it out of the page first.
export default defineShard(async () => {
	const site = 'https://www.enterprise-software.qualcomm.com';
	const page = await ky(site).text();
	const {
		groups: [bundle],
	} = match(page, /src="(\/assets\/index-[\w-]+\.js)"/);

	const script = await ky(`${site}${bundle}`).text();
	const {
		groups: [fileVersion],
	} = match(
		script,
		/softwarecenter\.qualcomm\.com\/api\/download\/software\/tools\/Snapdragon_ESRT\/Windows\/(\d+(?:\.\d+)+)\/SnapdragonEnterpriseSoftwareReadinessTool\.zip/,
	);

	// The download path carries a four-part file version (1.0.4.0) while the
	// release is named with three (1.0.4).
	const version = fileVersion.replace(/\.0$/, '');
	const urls = () => [
		`https://softwarecenter.qualcomm.com/api/download/software/tools/Snapdragon_ESRT/Windows/${fileVersion}/SnapdragonEnterpriseSoftwareReadinessTool.zip`,
	];

	return { version, urls };
});
