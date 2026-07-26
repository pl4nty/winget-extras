import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'googlefonts',
		repo: 'tinos',
		path: 'fonts/ttf/Tinos-Regular.ttf',
	}),
);
