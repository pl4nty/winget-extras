import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

// Application Verifier only ships inside the Windows SDK ISO, and its MSIs carry their own build
// (10.1.26100.3624) that no page lists. The SDK archive lists every SDK release, which is enough
// to notice a new one. The MSIs are extracted by hand and uploaded to the self-hosted mirror under
// the SDK version, and komac reads the package version from them.
const mirrorUrl = 'https://winget.tplant.com.au/download/m/Microsoft/WindowsSDK/AppVerifier';

export default defineShard(async () => {
	const page = await ky('https://developer.microsoft.com/en-us/windows/downloads/sdk-archive/', {
		timeout: 30_000,
		retry: 3,
	}).text();
	const sdk = Array.from(
		page.matchAll(/Windows SDK for Windows 1[01][^(<]*\((10\.0\.\d+\.\d+)\)/g),
		([, version]) => version!,
	)
		.sort(compareVersions)
		.at(-1);
	if (!sdk) {
		throw new Error('No Windows SDK versions found');
	}

	return {
		version: { source: 'product' },
		urls: () =>
			['x86', 'x64', 'arm64'].map((arch) =>
				encodeURI(
					`${mirrorUrl}/${sdk}/Application Verifier ${arch} External Package (DesktopEditions)-${arch}_en-us.msi`,
				),
			),
		state: sdk,
	};
});
