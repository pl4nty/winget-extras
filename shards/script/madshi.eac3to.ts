import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import { strFromU8, unzipSync } from 'fflate';
import ky from 'ky';

// madshi.net publishes eac3to only as an unversioned zip; its changelog opens with the version.
export default defineShard(async () => {
	const response = await ky('https://madshi.net/eac3to.zip');
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const files = unzipSync(new Uint8Array(await response.arrayBuffer()), {
		filter: (file) => file.name === 'eac3to/changelog.txt',
	});
	const changelog = files['eac3to/changelog.txt'];
	if (!changelog) {
		throw new Error('eac3to/changelog.txt is missing from the archive');
	}

	const version = match(strFromU8(changelog), /^\s*v(\d+(?:\.\d+)+)/).groups[0];
	const urls = () => ['https://madshi.net/eac3to.zip'];

	return {
		version,
		urls,
		state,
	};
});
