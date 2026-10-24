import { defineShard } from 'anthelion';
import { unzipSync } from 'fflate';
import ky from 'ky';

// madshi.net publishes eac3to only as an unversioned zip, and komac doesn't read version
// resources from files inside a zip, so read eac3to.exe's VS_FIXEDFILEINFO directly.
export default defineShard(async () => {
	const response = await ky('https://madshi.net/eac3to.zip');
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const exe = unzipSync(new Uint8Array(await response.arrayBuffer()), {
		filter: (file) => file.name === 'eac3to/eac3to.exe',
	})['eac3to/eac3to.exe'];
	if (!exe) {
		throw new Error('eac3to/eac3to.exe is missing from the archive');
	}

	const view = new DataView(exe.buffer, exe.byteOffset, exe.byteLength);
	const signature = exe.findIndex(
		(_, i) => i + 4 <= exe.length && view.getUint32(i, true) === 0xfeef04bd,
	);
	if (signature < 0) {
		throw new Error('eac3to.exe has no VS_FIXEDFILEINFO');
	}
	const [major, minor] = [
		view.getUint32(signature + 8, true),
		view.getUint32(signature + 12, true),
	];
	// Trailing zero parts are dropped, so 3.36.0.0 stays 3.36 like earlier releases
	const version = [major >>> 16, major & 0xffff, minor >>> 16, minor & 0xffff]
		.join('.')
		.replace(/(\.0)+$/, '');

	return {
		version,
		urls: () => ['https://madshi.net/eac3to.zip'],
		state,
	};
});
