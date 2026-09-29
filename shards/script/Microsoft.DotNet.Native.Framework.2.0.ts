import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '../../scripts/shard-lib/appx.ts';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index:
			'https://api.nuget.org/v3-flatcontainer/microsoft.net.native.sharedlibrary-x64/index.json',
		line: /^2\.0\.\d+$/,
		manifests: 'manifests/m/Microsoft/DotNet/Native/Framework/2/0',
		nupkg: (v) =>
			`https://globalcdn.nuget.org/packages/microsoft.net.native.sharedlibrary-x64.${v}.nupkg`,
		appx: /Microsoft\.NET\.Native\.Framework\.2\.0\.appx$/i,
	});

	return {
		version,
		urls: () => [
			`https://globalcdn.nuget.org/packages/microsoft.net.native.sharedlibrary-x64.${nugetVersion}.nupkg`,
			`https://globalcdn.nuget.org/packages/microsoft.net.native.sharedlibrary-x86.${nugetVersion}.nupkg`,
			`https://globalcdn.nuget.org/packages/microsoft.net.native.sharedlibrary-arm.${nugetVersion}.nupkg`,
		],
	};
});
