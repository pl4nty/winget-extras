import { defineShard } from 'anthelion';

import { extractInstallers, getLatestSdk } from '@/scripts/shards-lib/Microsoft.WindowsSDK';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

// Application Verifier only ships inside the Windows SDK ISO, and its MSIs carry their own build
// (10.1.26100.3624) that no page lists, so track SDK releases and read the version from the MSIs
export default defineShard(async () => {
	const sdk = await getLatestSdk();
	const files = ['x86', 'x64', 'arm64'].map(
		(arch) => `Application Verifier ${arch} External Package (DesktopEditions)-${arch}_en-us.msi`,
	);
	let extracted: ReturnType<typeof extractInstallers> | undefined;

	return {
		version: { source: 'product' },
		urls: () =>
			Promise.all(
				files.map((name) =>
					mirrorFile('Microsoft.WindowsSDK.AppVerifier', sdk.version, name, async () => {
						extracted ??= extractInstallers(sdk.iso, files);
						return (await extracted).get(name)!;
					}),
				),
			),
		state: sdk.version,
	};
});
