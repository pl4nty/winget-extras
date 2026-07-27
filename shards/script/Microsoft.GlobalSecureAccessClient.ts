import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link. The link is
// unversioned, so resolve it and publish the versioned installer it lands on.
//
// x86 only: komac drops the arm64 installer whenever its resolved URL is passed
// alongside another, so listing it here would silently produce the same single
// x86 manifest while implying otherwise.
const LINK = 'https://aka.ms/GlobalSecureAccess-Windows';

export default defineShard(async () => {
	const resolved = (await ky.head(LINK)).url;

	return {
		version: firstMatch(
			resolved,
			/GlobalSecureAccessInstaller_(\d+(?:\.\d+)+)\.exe$/i,
			'No version in the resolved installer name',
		),
		urls: [resolved],
	};
});
