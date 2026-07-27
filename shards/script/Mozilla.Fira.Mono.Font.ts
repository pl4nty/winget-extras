import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// Fira Mono is versioned independently of the repo's release tags, which track
// Fira Sans, so take the version from the font instead of the tag.
export default defineShard(() =>
	branchFontShard({
		owner: 'mozilla',
		repo: 'Fira',
		path: 'otf/FiraMono-Regular.otf',
	}),
);
