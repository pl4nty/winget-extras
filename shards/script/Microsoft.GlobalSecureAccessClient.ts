import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link, and both
// resolve to a versioned installer on the same origin.
//
// Both burn stubs are x86 PE binaries. komac merges downloads that analyse to
// the same architecture before it applies the `|architecture` overrides, so it
// currently emits the x86 installer alone no matter which order the URLs are
// given in. The overrides are kept so the arm64 installer reappears once that
// is fixed upstream.
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
