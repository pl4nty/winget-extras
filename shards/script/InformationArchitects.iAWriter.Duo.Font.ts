import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// `replace` corrects the hand-entered `2.0` to the 2.000 the font reports,
// instead of adding a second directory for the same font.
export default defineShard(async () => ({
	...(await branchFontShard({
		owner: 'iaolo',
		repo: 'iA-Fonts',
		path: 'iA%20Writer%20Duo/Static/iAWriterDuoS-Regular.ttf',
	})),
	replace: true,
}));
