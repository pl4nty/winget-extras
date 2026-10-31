import { defineShard } from 'anthelion';

import { extractInstallers, getLatestSdk } from '@/scripts/shards-lib/Microsoft.WindowsSDK';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

// Only ships in the SDK ISO, and no page lists its MSI version (10.1.26100.3624)
export default defineShard(async () => {
	const sdk = await getLatestSdk();
	const files = ['x86', 'x64', 'arm64'].map(
		(arch) => `Application Verifier ${arch} External Package (DesktopEditions)-${arch}_en-us.msi`,
	);
	let extracted: ReturnType<typeof extractInstallers> | undefined;

	return {
		version: { source: 'display' },
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
