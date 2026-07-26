import { defineShard } from 'anthelion';
import { githubClient } from 'anthelion/github';
import ky from 'ky';

import { fontVersion } from '@/scripts/font-version';

// The upstream repo has no versioned releases, so track the default branch and
// pin URLs to its head commit; the version comes from the font's name table.
export default defineShard(async () => {
	const [head] = await githubClient.rest.repos
		.listCommits({ owner: 'microsoft', repo: 'font-tools', per_page: 1 })
		.then(({ data }) => data);
	if (!head) throw new Error('No commits found');
	const sha = head.sha;
	const font = await ky(
		'https://raw.githubusercontent.com/microsoft/font-tools/' +
			sha +
			'/EgyptianOpenType/font/eot.ttf',
	).arrayBuffer();

	return {
		version: () => fontVersion(new Uint8Array(font)),
		urls: ['https://github.com/microsoft/font-tools/raw/' + sha + '/EgyptianOpenType/font/eot.ttf'],
		state: sha,
	};
});
