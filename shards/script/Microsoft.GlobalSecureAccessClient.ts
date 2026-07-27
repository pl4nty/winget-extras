import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link. Neither
// link is versioned, so resolve both and publish the versioned installers they
// land on, taking the version from the x86 name.
//
// Both burn stubs are 32-bit x86 PE binaries, so komac reads x86 from each and
// the architectures have to be declared here.
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
		urls: () => [
			{ url: x86, architecture: 'x86' },
			{ url: arm64, architecture: 'arm64' },
		],
	};
});
