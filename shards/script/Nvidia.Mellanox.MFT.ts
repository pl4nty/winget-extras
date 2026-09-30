import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

export default defineShard(async () => {
	const { latest } = await ky
		.post('https://downloaders.azurewebsites.net/downloaders/mft_downloader/helper.php', {
			body: new URLSearchParams({ action: 'get_versions' }),
		})
		.json<{ latest: string }>();

	// Long-term support builds carry a trailing label, such as `4.34.1-25-2025 LTS U3`.
	// They are served alongside the mainstream release rather than as `latest`, so an
	// unexpected shape is an upstream change worth failing on.
	const {
		groups: [release, build],
	} = match(latest, /^(\d+\.\d+\.\d+)-(\d+)$/);

	const version = `${release}.${build}`;
	const fileVersion = version.replaceAll('.', '_');
	const urls = () => [
		`https://content.mellanox.com/MFT/WinMFT_x64_${fileVersion}.exe`,
		`https://content.mellanox.com/MFT/winmft_arm64_${fileVersion}.zip`,
	];

	return {
		version,
		urls,
		releaseNotes: {
			releaseNotesUrl: `https://networking-docs.nvidia.com/mftswum/${release}/release-notes`,
		},
	};
});
