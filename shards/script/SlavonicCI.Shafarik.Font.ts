import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'slavonic',
		repo: 'Shafarik',
		path: 'fonts/otf/Shafarik-Regular.otf',
		urls: (sha) => [
			`https://github.com/slavonic/Shafarik/raw/${sha}/fonts/otf/Shafarik-Regular.otf`,
		],
	}),
);
