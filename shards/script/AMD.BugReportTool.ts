import { defineShard } from 'anthelion';
import ky from 'ky';

import { productVersion } from '@/scripts/pe-version';

// drivers.amd.com serves the installer only to requests carrying an amd.com
// referer, so neither winget nor komac can download it and the manifest points
// at a mirrored copy instead. Watch upstream anyway: a new build fails this
// shard with the URL to upload, and the next run picks the mirror up.
const INSTALLER = 'https://drivers.amd.com/drivers/software/amdbugreporttool.exe';
const REFERER = 'https://www.amd.com/en/resources/support-articles/faqs/AMDBRT.html';
const MIRROR = 'https://winget.tplant.com.au/download/a/AMD/BugReportTool';

export default defineShard(async () => {
	const response = await ky(INSTALLER, { headers: { referer: REFERER } });
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) throw new Error(`No entity tag or last-modified for ${INSTALLER}`);

	// The tool is unversioned upstream, and its filename never changes.
	const version = productVersion(new Uint8Array(await response.arrayBuffer()));
	const url = `${MIRROR}/${version}/amdbugreporttool.exe`;
	const mirrored = await ky.head(url, { throwHttpErrors: false });
	if (!mirrored.ok) throw new Error(`AMD published ${version}, upload ${INSTALLER} to ${url}`);

	// The self-extracting wrapper is 32-bit, but the tool it runs is x64 only.
	return { version, urls: () => [{ url, architecture: 'x64' }], state };
});
