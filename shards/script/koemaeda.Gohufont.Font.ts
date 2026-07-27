import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'koemaeda',
		repo: 'gohufont-ttf',
		path: 'gohufont-11.ttf',
	}),
);
