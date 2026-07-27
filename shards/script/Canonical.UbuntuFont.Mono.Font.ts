import { defineShard } from 'anthelion';

import { archiveFontShard } from '@/scripts/font-shard';

// Both Ubuntu font packages ship the same family archive and are versioned by
// the family release, so read Ubuntu-R.ttf here too: UbuntuMono-R.ttf carries
// its own 0.80, which would publish a downgrade against the family's 0.83.
export default defineShard(() =>
	archiveFontShard({
		url: 'https://assets.ubuntu.com/v1/0cef8205-ubuntu-font-family-0.83.zip',
		path: /Ubuntu-R\.ttf$/i,
	}),
);
