import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '../../scripts/shard-lib/appx.ts';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index: 'https://api.nuget.org/v3-flatcontainer/microsoft.net.native.compiler/index.json',
		line: /^1\.6\.\d+$/,
		manifests: 'manifests/m/Microsoft/DotNet/Native/Runtime/1/6',
		nupkg: (v) => `https://globalcdn.nuget.org/packages/microsoft.net.native.compiler.${v}.nupkg`,
		appx: /Microsoft\.NET\.Native\.Runtime\.1\.6\.appx$/i,
	});

	return {
		version,
		urls: () => [
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.net.native.compiler.${nugetVersion}.nupkg`,
				architecture: 'x64',
			},
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.net.native.compiler.${nugetVersion}.nupkg`,
				architecture: 'x86',
			},
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.net.native.compiler.${nugetVersion}.nupkg`,
				architecture: 'arm',
			},
		],
	};
});
