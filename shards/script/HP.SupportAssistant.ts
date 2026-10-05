import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The redirector script that the HP Support Assistant page uses to link the current
// SoftPaq answers 406 to ky's default JSON Accept header.
export default defineShard(async () => {
	const js = await ky('https://hpsa-redirectors.hpcloud.hp.com/common/hpsaredirector.js', {
		headers: { Accept: '*/*' },
	}).text();

	const {
		groups: [range, softpaq, version],
	} = match(
		js,
		/catch \(e\) \{ \}\s+return getProtocol\(\) \+ "ftp\.hp\.com\/pub\/softpaq\/(?<range>sp\d+-\d+)\/(?<softpaq>sp\d+)\.exe";\s*\/\/(?<version>\d+(?:\.\d+)+)/i,
	);

	return {
		version,
		urls: () => [`https://ftp.hp.com/pub/softpaq/${range}/${softpaq}.exe`],
	};
});
