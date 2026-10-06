import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The product page shows "Version 16 Build 6004"; the installer bundles 16.6004.
export default defineShard(async () => {
	const page = await ky('https://www.ireasoning.com/mibbrowser.shtml').text();

	const [major, build] = match(page, /Version\s+(\d+)\s+Build\s+(\d+)/i).groups;
	const version = `${major}.${build}`;
	const urls = () => ['https://www.ireasoning.com/download/mibfree/setup.exe'];

	return {
		version,
		urls,
	};
});
