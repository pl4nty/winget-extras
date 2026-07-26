import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// `replace` corrects the hand-entered `1` to the 1.000 the font reports, and
// repins the URL, which still points at a commit the branch has moved past.
export default defineShard(async () => ({
	...(await branchFontShard({
		owner: 'ScriptEncodingInitiative',
		repo: 'sunuwar',
		path: 'sei/SEISunuwar-Regular.otf',
		urls: (sha) => [
			`https://github.com/ScriptEncodingInitiative/sunuwar/raw/${sha}/sei/SEISunuwar-Regular.otf`,
		],
	})),
	replace: true,
}));
