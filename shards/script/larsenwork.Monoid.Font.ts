import { defineShard } from 'anthelion';

import { archiveFontShard, headCommit } from '@/scripts/font-shard';

// Monoid.zip only exists on the default branch, so pin it to the head commit
// and take the version from the font inside.
export default defineShard(async () => {
	const sha = await headCommit('larsenwork', 'monoid');

	return archiveFontShard({
		url: `https://github.com/larsenwork/monoid/raw/${sha}/Monoid.zip`,
		path: /Monoid-Regular\.ttf$/i,
	});
});
