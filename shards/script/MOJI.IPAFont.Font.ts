import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// The download index links the current IPA font release as /ipafont/ipa00303/
// with no dotted version anywhere on the page, so derive the version from that
// identifier: the first three digits are the major, the rest the minor.
export default defineShard(async () => {
	const page = await ky('https://moji.or.jp/ipafont/ipafontdownload/').text();
	const release = firstMatch(page, /\/ipafont\/ipa(\d{5})\//i, 'No IPA font release found');

	return {
		version: `${release.slice(0, 3)}.${release.slice(3)}`,
		urls: () => [`https://moji.or.jp/wp-content/ipafont/IPAfont/IPAfont${release}.zip`],
	};
});
