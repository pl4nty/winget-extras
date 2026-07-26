import { defineShard } from 'anthelion';

import { branchFontShard } from '@/scripts/font-shard';

// The package tracks the ligaturized SF Mono itself, not the Ligaturizer that
// produced it, so `replace` corrects the hand-entered `3.4.0` to the 16.0 the
// font reports.
export default defineShard(async () => ({
	...(await branchFontShard({
		owner: 'shaunsingh',
		repo: 'SFMono-Nerd-Font-Ligaturized',
		path: 'LigaSFMonoNerdFont-Regular.otf',
	})),
	replace: true,
}));
