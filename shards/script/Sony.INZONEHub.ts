import { createDecipheriv } from 'node:crypto';

import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// INZONE Hub's own update feed. The body after the `eaid`/`daid`/`digest` header is
// AES-128-ECB encrypted (ENC0003) with Sony's update-service key.
const KEY = Buffer.from('73e84a54d05837a8acdc5d9e2d652b97', 'hex');

export default defineShard(async () => {
	const data = Buffer.from(
		await ky('https://info.update.sony.net/HP002/APID001WN00/info/info.xml').arrayBuffer(),
	);
	const body = data.subarray(data.indexOf('\n\n') + 2);
	const decipher = createDecipheriv('aes-128-ecb', KEY, null).setAutoPadding(false);
	const xml = Buffer.concat([decipher.update(body), decipher.final()]).toString();

	const {
		groups: [url, version],
	} = match(
		xml,
		/URI="(?<url>https:\/\/info\.update\.sony\.net\/HP002\/APID001WN00\/contents\/\d+\/INZONEHub_Setup_[\d.]+\.exe)" Version="(?<version>\d+(?:\.\d+)+)"/,
	);

	return { version, urls: () => [url] };
});
