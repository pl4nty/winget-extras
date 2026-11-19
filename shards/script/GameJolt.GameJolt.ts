import { defineShard } from 'anthelion';
import ky from 'ky';

import { mirror } from '@/scripts/shards-lib/mirror';

const api = 'https://gamejolt.com/site-api/web/discover/games';

type Package = {
	releases: { version_number: string }[];
	builds: { id: number; os_windows: boolean | null; primary_file: { filename: string } }[];
};

// download.gamejolt.net URLs expire after 24 hours
export default defineShard(async () => {
	const { payload } = await ky(`${api}/packages/362412`).json<{ payload: Package }>();
	const version = payload.releases[0]!.version_number;
	const build = payload.builds.find(
		(b) => b.os_windows && b.primary_file.filename === 'gamejoltclientsetup.exe',
	);
	if (!build) {
		throw new Error('No Windows build of the Game Jolt client');
	}

	return {
		version,
		urls: async () => {
			const { payload } = await ky
				.post(`${api}/builds/get-download-url/${build.id}`, { json: {} })
				.json<{ payload: { url: string } }>();
			return [await mirror('GameJolt.GameJolt', version, payload.url)];
		},
	};
});
