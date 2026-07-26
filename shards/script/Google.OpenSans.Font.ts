import { defineShard } from 'anthelion';
import { githubClient } from 'anthelion/github';
import ky from 'ky';

// The upstream repo has no versioned releases, so track the default branch and
// pin URLs to its head commit; the version comes from the font's name table.
function fontVersion(bytes: Uint8Array): string {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const numTables = view.getUint16(4);
	for (let i = 0; i < numTables; i++) {
		const record = 12 + i * 16;
		if (String.fromCharCode(...bytes.subarray(record, record + 4)) !== 'name') continue;
		const table = view.getUint32(record + 8);
		const count = view.getUint16(table + 2);
		const storage = table + view.getUint16(table + 4);
		for (let j = 0; j < count; j++) {
			const name = table + 6 + j * 12;
			if (view.getUint16(name + 6) !== 5) continue;
			const length = view.getUint16(name + 8);
			const offset = storage + view.getUint16(name + 10);
			let text = '';
			if (view.getUint16(name) === 1)
				text = String.fromCharCode(...bytes.subarray(offset, offset + length));
			else
				for (let k = 0; k < length; k += 2) text += String.fromCharCode(view.getUint16(offset + k));
			const version = /\d+(?:\.\d+)+/.exec(text)?.[0];
			if (version) return version;
		}
	}
	throw new Error('No version found in font name table');
}

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
