import { defineShard } from 'anthelion';
import { getLatestFileCommit } from 'anthelion/github';
import ky from 'ky';

// VictorMonoAll.zip only exists on master (release tags carry no assets), so
// track package.json and pin the URL to its latest commit.
export default defineShard(async () => {
	const sha = await getLatestFileCommit({
		owner: 'rubjo',
		repo: 'victor-mono',
		path: 'package.json',
	});

	const { version } = await ky(
		`https://raw.githubusercontent.com/rubjo/victor-mono/${sha}/package.json`,
	).json<{ version: string }>();
	const urls = () => [`https://github.com/rubjo/victor-mono/raw/${sha}/public/VictorMonoAll.zip`];

	return {
		version,
		urls,
	};
});
