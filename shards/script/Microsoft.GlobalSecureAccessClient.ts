import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// Microsoft publishes each architecture behind its own vanity link. Both burn
// stubs are x86 PE binaries, so komac cannot tell them apart on its own and
// keeps only one installer unless each URL declares its architecture.
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
