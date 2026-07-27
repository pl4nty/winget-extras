import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

// `replace` corrects the hand-entered `1.6` to the 1.600 the font reports.
export default defineShard(async () => ({
	...(await archiveFontShard({
		url: 'https://dl.dafont.com/dl/?f=nouveau_ibm',
		path: /Nouveau_IBM\.ttf$/i,
	})),
	replace: true,
}));
