import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// `replace` corrects the hand-entered `1.1` to the 1.1.0 the font reports,
// instead of adding a second directory for the same font.
export default defineShard(async () => ({
	...(await branchFontShard({
		owner: 'Slevinski',
		repo: 'signwriting_2010_fonts',
		path: 'fonts/SuttonSignWriting.ttf',
	})),
	replace: true,
}));
