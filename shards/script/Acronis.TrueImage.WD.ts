import { defineShard } from 'anthelion';
import ky from 'ky';

import { readFirstEntry, readProductVersion } from '@/scripts/shards-lib/pe-version';

const url = 'https://downloads.wdc.com/acronis/AcronisTrueImageWD_WIN.zip';
// The installer is a ~1GB zip. Its PE headers and resources sit at the start, so a short prefix is enough
const prefixBytes = 16 * 1024 * 1024;

// WD publishes the installer at a fixed URL with no version anywhere on its download page,
// and komac can't read versions from this exe, so read it from the installer's own resources
export default defineShard(async () => {
	const response = await ky(url, { headers: { range: `bytes=0-${prefixBytes - 1}` } });
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const version = readProductVersion(readFirstEntry(new Uint8Array(await response.arrayBuffer())));

	return { version, urls: () => [url], state };
});
