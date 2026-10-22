import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

import { readFirstEntry, readProductVersion } from '@/scripts/shards-lib/pe-version';

const url = 'https://downloads.wdc.com/acronis/AcronisTrueImageWD_WIN.zip';
const notesUrl =
	'https://downloads.wdc.com/acronis/release_notes/TrueImageWesternDigital_relnotes_en-US.pdf';
// The installer is a ~1GB zip. Its PE headers and resources sit at the start, so a short prefix is enough
const prefixBytes = 16 * 1024 * 1024;

// The release notes only list build numbers (e.g. "Build 42752 (Windows)"), not the full 30.0.1.42752
// version, and komac can't read versions from this exe, so take the full version from the installer's
// own resources and use the notes' latest Windows build as the state
export default defineShard(async () => {
	// The PDF's bookmark titles are stored uncompressed, newest release first
	const notes = new TextDecoder('latin1').decode(await ky(notesUrl).arrayBuffer());
	const {
		groups: [build],
	} = match(notes, /\/Title\s*\(Build (\d+) \\\(Windows/);

	const response = await ky(url, { headers: { range: `bytes=0-${prefixBytes - 1}` } });
	const version = readProductVersion(readFirstEntry(new Uint8Array(await response.arrayBuffer())));
	if (!version.endsWith(`.${build}`)) {
		throw new Error(`Installer version ${version} doesn't match release notes build ${build}`);
	}

	return { version, urls: () => [url], state: build! };
});
