import { defineShard } from 'anthelion';
import ky from 'ky';

import { headCommit } from '@/scripts/font-shard';

// VictorMonoAll.zip only exists on master (release tags carry no assets), so
// track master and pin the URL to its head commit; the version comes from
// package.json at the same commit.
export default defineShard(async () => {
	const sha = await headCommit('rubjo', 'victor-mono');
	const { version } = await ky(
		`https://raw.githubusercontent.com/rubjo/victor-mono/${sha}/package.json`,
	).json<{ version: string }>();

	return {
		version: () => version,
		urls: [`https://github.com/rubjo/victor-mono/raw/${sha}/public/VictorMonoAll.zip`],
		state: sha,
	};
});
