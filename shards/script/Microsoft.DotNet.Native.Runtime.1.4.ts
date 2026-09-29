import { defineShard } from 'anthelion';

import { appxVersionAt } from '../../scripts/shard-lib/appx.ts';

// Microsoft only ships this runtime as test assets in microsoft/app-metadata.
export default defineShard(async () => {
	const path = 'test/assets/UwpApp_1/Dependencies';
	const version = await appxVersionAt(
		`https://raw.githubusercontent.com/microsoft/app-metadata/master/${path}/x64/Microsoft.NET.Native.Runtime.1.4.appx`,
	);

	return {
		version,
		urls: () => [
			`https://github.com/microsoft/app-metadata/raw/refs/heads/master/${path}/x64/Microsoft.NET.Native.Runtime.1.4.appx`,
			`https://github.com/microsoft/app-metadata/raw/refs/heads/master/${path}/x86/Microsoft.NET.Native.Runtime.1.4.appx`,
			`https://github.com/microsoft/app-metadata/raw/refs/heads/master/${path}/ARM/Microsoft.NET.Native.Runtime.1.4.appx`,
		],
	};
});
