import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	archiveFontShard({
		url: 'https://developer.huawei.com/images/download/general/HarmonyOS-Sans.zip',
		path: /HarmonyOS_Sans_Regular\.ttf$/i,
	}),
);
