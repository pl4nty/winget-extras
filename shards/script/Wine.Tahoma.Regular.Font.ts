import { defineShard } from 'anthelion';
import ky from 'ky';

// Filtering commits by path takes ~10s on gitlab.winehq.org, which is right at
// ky's default ten-second timeout, so allow more time and retry.
export default defineShard(async () => {
	const [{ id }] = await ky(
		'https://gitlab.winehq.org/api/v4/projects/wine%2Fwine/repository/commits?path=fonts/tahoma.ttf&per_page=1',
		{ timeout: 60_000, retry: 3 },
	).json<[{ id: string }]>();

	const version = { source: 'fontVersion' };
	const urls = () => [`https://gitlab.winehq.org/wine/wine/-/raw/${id}/fonts/tahoma.ttf`];

	return {
		version,
		urls,
		state: id,
	};
});
