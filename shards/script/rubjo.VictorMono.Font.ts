import { defineShard } from 'anthelion';
import { githubClient } from 'anthelion/github';
import ky from 'ky';

// VictorMonoAll.zip only exists on master (release tags carry no assets), so
// track master and pin the URL to its head commit; the version comes from
// package.json at the same commit.
export default defineShard(async () => {
	const [head] = await githubClient.rest.repos
		.listCommits({ owner: 'rubjo', repo: 'victor-mono', per_page: 1 })
		.then(({ data }) => data);
	if (!head) throw new Error('No commits found');
	const sha = head.sha;
	const { version } = await ky(
		`https://raw.githubusercontent.com/rubjo/victor-mono/${sha}/package.json`,
	).json<{ version: string }>();

	return {
		version: () => version,
		urls: [`https://raw.githubusercontent.com/rubjo/victor-mono/${sha}/public/VictorMonoAll.zip`],
		state: sha,
	};
});
