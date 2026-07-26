import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'googlefonts',
		repo: 'FiraGFVersion',
		path: 'fonts/FiraSansExtraCondensed-Regular.ttf',
	}),
);
