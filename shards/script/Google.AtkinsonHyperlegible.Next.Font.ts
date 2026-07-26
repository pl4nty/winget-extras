import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

export default defineShard(() =>
	branchFontShard({
		owner: 'googlefonts',
		repo: 'atkinson-hyperlegible-next',
		path: 'fonts/otf/AtkinsonHyperlegibleNext-Regular.otf',
	}),
);
