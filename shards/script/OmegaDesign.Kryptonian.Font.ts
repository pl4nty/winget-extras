import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	archiveFontShard({
		url: 'https://www.supermanhomepage.com/multimedia/Fonts/krypton-font.zip',
		path: /kryptonian\.ttf$/i,
	}),
);
