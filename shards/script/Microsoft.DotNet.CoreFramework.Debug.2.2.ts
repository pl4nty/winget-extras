import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '../../scripts/shard-lib/appx.ts';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index:
			'https://api.nuget.org/v3-flatcontainer/runtime.win10-x64.microsoft.net.uwpcoreruntimesdk/index.json',
		line: /^2\.2\.\d+$/,
		manifests: 'manifests/m/Microsoft/DotNet/CoreFramework/Debug/2/2',
		nupkg: (v) =>
			`https://globalcdn.nuget.org/packages/runtime.win10-x64.microsoft.net.uwpcoreruntimesdk.${v}.nupkg`,
		appx: /Microsoft\.NET\.CoreFramework\.Debug\.2\.2\.appx$/i,
	});

	return {
		version,
		urls: () => [
			{
				url: `https://globalcdn.nuget.org/packages/runtime.win10-x64.microsoft.net.uwpcoreruntimesdk.${nugetVersion}.nupkg`,
				nestedInstallerMatches: ['CoreFramework.Debug'],
			},
			{
				url: `https://globalcdn.nuget.org/packages/runtime.win10-x86.microsoft.net.uwpcoreruntimesdk.${nugetVersion}.nupkg`,
				nestedInstallerMatches: ['CoreFramework.Debug'],
			},
			{
				url: `https://globalcdn.nuget.org/packages/runtime.win10-arm.microsoft.net.uwpcoreruntimesdk.${nugetVersion}.nupkg`,
				nestedInstallerMatches: ['CoreFramework.Debug'],
			},
		],
	};
});
