import { defineShard } from 'anthelion';
import { githubClient } from 'anthelion/github';
import ky from 'ky';

import { fontVersion } from '@/scripts/font-version';

// The upstream repo has no versioned releases, so track the default branch and
// pin URLs to its head commit; the version comes from the font's name table.
export default defineShard(async () => {
	const [head] = await githubClient.rest.repos
		.listCommits({ owner: 'googlefonts', repo: 'opensans', per_page: 1 })
		.then(({ data }) => data);
	if (!head) throw new Error('No commits found');
	const sha = head.sha;
	const font = await ky(
		'https://raw.githubusercontent.com/googlefonts/opensans/' +
			sha +
			'/fonts/variable/OpenSans%5Bwdth%2Cwght%5D.ttf',
	).arrayBuffer();

	return {
		version: () => fontVersion(new Uint8Array(font)),
		urls: [
			'https://raw.githubusercontent.com/googlefonts/opensans/' +
				sha +
				'/fonts/variable/OpenSans%5Bwdth%2Cwght%5D.ttf',
		],
		state: sha,
	};
});
