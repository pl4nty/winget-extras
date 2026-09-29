import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '../../scripts/shard-lib/appx.ts';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index: 'https://api.nuget.org/v3-flatcontainer/microsoft.ui.xaml/index.json',
		line: /^2\.3\.\d+$/,
		manifests: 'manifests/m/Microsoft/UI/Xaml/2/3',
		nupkg: (v) => `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${v}.nupkg`,
		appx: /Microsoft\.UI\.Xaml\.2\.3\.appx$/i,
	});

	return {
		version,
		urls: () => [
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${nugetVersion}.nupkg`,
				architecture: 'x64',
			},
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${nugetVersion}.nupkg`,
				architecture: 'x86',
			},
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${nugetVersion}.nupkg`,
				architecture: 'arm64',
			},
			{
				url: `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${nugetVersion}.nupkg`,
				architecture: 'arm',
			},
		],
	};
});
