import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

const nuget = 'https://api.nuget.org/v3-flatcontainer/microsoft.windows.sdk.buildtools';

export default defineShard(async () => {
	const { versions } = await ky(`${nuget}/index.json`).json<{ versions: string[] }>();
	const version = versions
		.filter((v) => !v.includes('-'))
		.sort(compareVersions)
		.at(-1);
	if (!version) {
		throw new Error('No stable Microsoft.Windows.SDK.BuildTools version found');
	}
	// Tools sit under bin/<platform version>/<arch>, e.g. bin/10.0.28000.0/x64
	const platform = `${version.split('.').slice(0, 3).join('.')}.0`;
	const url = `${nuget}/${version}/microsoft.windows.sdk.buildtools.${version}.nupkg`;

	return {
		version,
		urls: () =>
			(['x86', 'x64', 'arm64'] as const).map((architecture) => ({
				url,
				architecture,
				nestedInstallerMatches: [`bin/${platform}/${architecture}/`],
			})),
	};
});
