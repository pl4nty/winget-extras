import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'googlefonts',
		repo: 'opensans',
		path: 'fonts/variable/OpenSans%5Bwdth%2Cwght%5D.ttf',
		urls: (sha) => [
			`https://raw.githubusercontent.com/googlefonts/opensans/${sha}/fonts/variable/OpenSans%5Bwdth%2Cwght%5D.ttf`,
		],
	}),
);
