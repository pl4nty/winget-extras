import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	archiveFontShard({
		url: 'https://assets.ubuntu.com/v1/0cef8205-ubuntu-font-family-0.83.zip',
		path: /Ubuntu-R\.ttf$/i,
	}),
);
