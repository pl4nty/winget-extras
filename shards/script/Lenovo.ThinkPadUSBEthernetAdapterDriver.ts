import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// DS504778 also lists the Win11-only package (u3etn16w), which installs a different driver package
export default defineShard(async () => {
	const page = await ky('https://pcsupport.lenovo.com/us/en/downloads/ds504778').text();
	const {
		groups: [version, url],
	} = match(
		page,
		/"Version":"([\d.]+)","URL":"(https:\/\/download\.lenovo\.com\/pccbbs\/mobiles\/[^"]+_win10\.exe)"/i,
	);

	return {
		version: version!,
		urls: () => [url!],
		releaseNotes: { releaseNotesUrl: url!.replace(/\.exe$/, '.html') },
	};
});
