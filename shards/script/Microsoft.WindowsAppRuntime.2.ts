import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

// The downloads page lists every Windows App SDK release as aka.ms links. Take the newest stable
// 2.x runtime and resolve each link to its download.microsoft.com URL, as the manifests carry.
export default defineShard(async () => {
	const page = await ky(
		'https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/downloads',
	).text();
	const versions = [
		...page.matchAll(
			/aka\.ms\/windowsappsdk\/2\.\d+\/(2\.\d+\.\d+)\/windowsappruntimeinstall-x64\.exe/gi,
		),
	].map(([, version]) => version!);
	const version = versions.sort(compareVersions).at(-1);
	if (!version) {
		throw new Error('No stable Windows App Runtime 2 release found');
	}

	const minor = version.split('.').slice(0, 2).join('.');
	const urls = await Promise.all(
		['x64', 'x86', 'arm64'].map(
			async (arch) =>
				(
					await ky.head(
						`https://aka.ms/windowsappsdk/${minor}/${version}/windowsappruntimeinstall-${arch}.exe`,
					)
				).url,
		),
	);

	return { version, urls: () => urls };
});
