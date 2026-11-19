import { defineShard } from 'anthelion';
import { getLatestReleaseFromRedirect } from 'anthelion/github';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

// Releases only ship tar.gz archives, which winget can't extract
export default defineShard(async () => {
	const { version, rawTag } = await getLatestReleaseFromRedirect({
		owner: 'suzuki-shunsuke',
		repo: 'asciinema-trim',
	});

	return {
		version,
		urls: async () => [
			await mirrorFile('ShunsukeSuzuki.AsciinemaTrim', version, 'asciinema-trim.exe', async () => {
				const archive = await ky(
					`https://github.com/suzuki-shunsuke/asciinema-trim/releases/download/${rawTag}/asciinema-trim_windows_amd64.tar.gz`,
				).bytes();
				const exe = (await new Bun.Archive(archive).files()).get('asciinema-trim.exe');
				if (!exe) {
					throw new Error('asciinema-trim.exe is missing from the release archive');
				}
				return exe;
			}),
		],
	};
});
