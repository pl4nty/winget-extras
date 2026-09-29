import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '../../scripts/shard-lib/appx.ts';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index:
			'https://api.nuget.org/v3-flatcontainer/runtime.win10-x64.microsoft.net.native.sharedlibrary/index.json',
		line: /^2\.2\.\d+-rel-\d+-\d+$/,
		manifests: 'manifests/m/Microsoft/DotNet/Native/Framework',
		nupkg: (v) =>
			`https://globalcdn.nuget.org/packages/runtime.win10-x64.microsoft.net.native.sharedlibrary.${v}.nupkg`,
		appx: /Microsoft\.NET\.Native\.Framework\.2\.2\.appx$/i,
	});

	return {
		version,
		urls: () => [
			`https://globalcdn.nuget.org/packages/runtime.win10-x64.microsoft.net.native.sharedlibrary.${nugetVersion}.nupkg`,
			`https://globalcdn.nuget.org/packages/runtime.win10-x86.microsoft.net.native.sharedlibrary.${nugetVersion}.nupkg`,
			`https://globalcdn.nuget.org/packages/runtime.win10-arm64.microsoft.net.native.sharedlibrary.${nugetVersion}.nupkg`,
			`https://globalcdn.nuget.org/packages/runtime.win10-arm.microsoft.net.native.sharedlibrary.${nugetVersion}.nupkg`,
		],
	};
});
