import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

// kreativekorp.com answers 406 without a browser user agent. `replace`
// corrects the hand-entered `1` to the 1.0 the font reports.
export default defineShard(async () => ({
	...(await archiveFontShard({
		url: 'https://www.kreativekorp.com/swdownload/fonts/retro/petme.zip',
		path: /PetMe\.ttf$/i,
		headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
	})),
	replace: true,
}));
