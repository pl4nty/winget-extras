import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { headers, mirrorDriver } from '@/scripts/shards-lib/AMD';

export default defineShard(async () => {
	const page = await ky('https://www.amd.com/en/support/download/drivers.html', {
		headers,
	}).text();
	const {
		groups: [url, version],
	} = match(
		page,
		/(https:\/\/drivers\.amd\.com\/drivers\/installer\/[^"]+\/amd-software-adrenalin-edition-([\d.]+)-minimalsetup-\d+_web\.exe)/,
	);

	return {
		version: version!,
		urls: async () => [await mirrorDriver('AMD.AMDSoftwareAdrenalinEdition', version!, url!)],
		releaseNotes: {
			releaseNotesUrl: `https://www.amd.com/en/resources/support-articles/release-notes/RN-RAD-WIN-${version!.replaceAll('.', '-')}.html`,
		},
	};
});
