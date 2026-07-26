import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'microsoft',
		repo: 'font-tools',
		path: 'EgyptianOpenType/font/eot.ttf',
		urls: (sha) => [
			`https://github.com/microsoft/font-tools/raw/${sha}/EgyptianOpenType/font/eot.ttf`,
		],
	}),
);
