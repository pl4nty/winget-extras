import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	archiveFontShard({
		url: 'https://www.latofonts.com/files/Lato2OFL.zip',
		path: /Lato-Regular\.ttf$/i,
	}),
);
