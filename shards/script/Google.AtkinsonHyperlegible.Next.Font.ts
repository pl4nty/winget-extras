import { defineShard } from 'anthelion';
import { githubClient } from 'anthelion/github';
import ky from 'ky';

import { fontVersion } from '@/scripts/font-version';

// The upstream repo has no versioned releases, so track the default branch and
// pin URLs to its head commit; the version comes from the font's name table.
export default defineShard(async () => {
	const [head] = await githubClient.rest.repos
		.listCommits({ owner: 'googlefonts', repo: 'atkinson-hyperlegible-next', per_page: 1 })
		.then(({ data }) => data);
	if (!head) throw new Error('No commits found');
	const sha = head.sha;
	const font = await ky(
		'https://raw.githubusercontent.com/googlefonts/atkinson-hyperlegible-next/' +
			sha +
			'/fonts/otf/AtkinsonHyperlegibleNext-Regular.otf',
	).arrayBuffer();

	return {
		version: () => fontVersion(new Uint8Array(font)),
		urls: ['https://github.com/googlefonts/atkinson-hyperlegible-next/archive/' + sha + '.zip'],
		state: sha,
	};
});
