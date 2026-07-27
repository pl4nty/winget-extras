import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// `replace` corrects the hand-entered `3` to the 3.000 the font reports,
// instead of adding a second directory for the same font.
export default defineShard(async () => ({
	...(await branchFontShard({
		owner: 'andrew-paglinawan',
		repo: 'QuicksandFamily',
		path: 'fonts/statics/Quicksand-Regular.ttf',
	})),
	replace: true,
}));
