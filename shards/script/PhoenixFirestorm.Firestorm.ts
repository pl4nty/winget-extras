import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

// firestormviewer.org sits behind a Cloudflare challenge, so read release versions
// from the vendor's own repository tags (Firestorm_Release_<major.minor.patch.build>)
// and confirm the installer is live on the vendor's download host, since the tag can
// land before the build is uploaded.
const installerUrl = (version: string) =>
	`https://downloads.firestormviewer.org/release/windows/Phoenix-Firestorm-Releasex64_AVX2-${version.replaceAll('.', '-')}_Setup.exe`;

export default defineShard(async () => {
	const refs = await ky(
		'https://github.com/FirestormViewer/phoenix-firestorm/info/refs?service=git-upload-pack',
	).text();
	const versions = [
		...new Set(
			[...refs.matchAll(/refs\/tags\/Firestorm_Release_(\d+(?:\.\d+){3})(?:\^\{\})?\n/g)].map(
				([, version]) => version!,
			),
		),
	].sort((a, b) => compareVersions(b, a));

	for (const version of versions.slice(0, 3)) {
		const response = await ky.head(installerUrl(version), { throwHttpErrors: false });
		if (response.ok) {
			return { version, urls: () => [installerUrl(version)] };
		}
	}
	throw new Error('No published installer found for the latest Firestorm release tags');
});
