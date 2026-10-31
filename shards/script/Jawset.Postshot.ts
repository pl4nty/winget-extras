import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { mirror } from '@/scripts/shards-lib/mirror';

const builds = 'https://www.jawset.com/builds/postshot/windows';

// Builds are served from extension-less URLs with a type-less Content-Disposition, which komac's
// analyzer takes for a ZIP, so mirror them under their .exe name
export default defineShard(async () => {
	const disposition = (await ky.head(`${builds}/latest`)).headers.get('content-disposition') ?? '';
	const {
		groups: [version],
	} = match(disposition, /Postshot-(\d+(?:\.\d+)+)\.exe/);

	return {
		version,
		urls: async () => [
			await mirror('Jawset.Postshot', version, `${builds}/${version}`, `Postshot-${version}.exe`),
		],
	};
});
