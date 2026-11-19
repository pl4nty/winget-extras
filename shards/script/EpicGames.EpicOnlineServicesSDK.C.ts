import { defineShard } from 'anthelion';
import ky from 'ky';

type Archive = { archive_type: string; archive_id: number; version: string };

export default defineShard(async () => {
	const { results } = await ky('https://onlineservices.epicgames.com/api/cosmos/sdk').json<{
		results: Record<string, Archive>;
	}>();
	const { archive_id, archive_type, version } = results.sdk!;

	return {
		version: version.replace(/-CL\d+$/, ''),
		urls: () => [
			`https://onlineservices.epicgames.com/api/cosmos/sdk/download?archive_id=${archive_id}&archive_type=${archive_type}`,
		],
	};
});
