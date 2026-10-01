import { defineShard } from 'anthelion';

import { nugetAppxVersion } from '@/scripts/shards-lib/appx';

export default defineShard(async () => {
	const { version, nugetVersion } = await nugetAppxVersion({
		index: 'https://api.nuget.org/v3-flatcontainer/microsoft.ui.xaml/index.json',
		line: /^2\.4\.\d+$/,
		manifests: 'manifests/m/Microsoft/UI/Xaml/2/4',
		nupkg: (v) => `https://globalcdn.nuget.org/packages/microsoft.ui.xaml.${v}.nupkg`,
		appx: /Microsoft\.UI\.Xaml\.2\.4\.appx$/i,
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
