import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link. Neither
// link is versioned, so resolve both and publish the versioned installers they
// land on, taking the version from the x86 name.
//
// Both burn stubs are 32-bit x86 PE binaries, hence the architecture overrides.
// komac currently keeps only the x86 installer when both resolved URLs are
// passed, though it honours `|arm64` when the arm64 URL is passed on its own,
// and keeps both installers when passed the vanity links instead.
const LINKS = {
	x86: 'https://aka.ms/GlobalSecureAccess-Windows',
	arm64: 'https://aka.ms/GlobalSecureAccess-WindowsOnArm',
};

export default defineShard(async () => {
	const [x86, arm64] = await Promise.all(
		[LINKS.x86, LINKS.arm64].map(async (link) => (await ky.head(link)).url),
	);
	if (!x86 || !arm64) throw new Error('A Global Secure Access vanity link did not resolve');

	return {
		version: firstMatch(
			x86,
			/GlobalSecureAccessInstaller_(\d+(?:\.\d+)+)\.exe$/i,
			'No version in the resolved installer name',
		),
		urls: [`${x86}|x86`, `${arm64}|arm64`],
	};
});
