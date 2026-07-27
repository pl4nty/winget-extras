import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'eugeneching',
		repo: 'consolas-powerline-vim',
		path: 'CONSOLA-Powerline.ttf',
	}),
);
