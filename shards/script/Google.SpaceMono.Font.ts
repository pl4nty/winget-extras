import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'googlefonts',
		repo: 'spacemono',
		path: 'fonts/ttf/SpaceMono-Regular.ttf',
	}),
);
