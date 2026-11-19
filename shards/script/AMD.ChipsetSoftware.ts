import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { headers, mirrorDriver } from '@/scripts/shards-lib/AMD';

export default defineShard(async () => {
	const page = await ky(
		'https://www.amd.com/en/support/downloads/drivers.html/chipsets/am5/x870e.html',
		{ headers },
	).text();
	const {
		groups: [url, version],
	} = match(page, /(https:\/\/drivers\.amd\.com\/drivers\/amd_chipset_software_([\d.]+)\.exe)/i);

	return {
		version: version!,
		urls: async () => [
			{ url: await mirrorDriver('AMD.ChipsetSoftware', version!, url!), architecture: 'x64' },
		],
		releaseNotes: {
			releaseNotesUrl: `https://www.amd.com/en/resources/support-articles/release-notes/RN-RYZEN-CHIPSET-${version!.replaceAll('.', '-')}.html`,
		},
	};
});
