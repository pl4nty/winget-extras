import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link. Neither
// link is versioned, so resolve the x86 one to read the version out of the
// installer name it lands on.
//
// Publish the vanity links rather than the versioned URLs they resolve to:
// komac keeps both installers when given the links, but only the x86 one when
// given their destinations, even though the downloads and the architecture
// overrides are identical either way.
const LINKS = {
	x86: 'https://aka.ms/GlobalSecureAccess-Windows',
	arm64: 'https://aka.ms/GlobalSecureAccess-WindowsOnArm',
};

export default defineShard(async () => {
	const [resolved, arm64] = await Promise.all(
		[LINKS.x86, LINKS.arm64].map(async (link) => (await ky.head(link)).url),
	);
	if (!resolved || !arm64) throw new Error('A Global Secure Access vanity link did not resolve');

	return {
		version: firstMatch(
			resolved,
			/GlobalSecureAccessInstaller_(\d+(?:\.\d+)+)\.exe$/i,
			'No version in the resolved installer name',
		),
		urls: [`${resolved}|x86`, `${arm64.replace('_arm64_', '_%61rm64_')}|arm64`],
	};
});
