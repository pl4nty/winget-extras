import { defineShard } from 'anthelion';
import ky from 'ky';

// drivers.amd.com serves the installer only to requests carrying an amd.com
// referer, which no JSON strategy can send: a headerless state read follows the
// redirect to an error page whose headers never change. Read it here instead.
const INSTALLER = 'https://drivers.amd.com/drivers/software/amdbugreporttool.exe';
const REFERER = 'https://www.amd.com/en/resources/support-articles/faqs/AMDBRT.html';

export default defineShard(async () => {
	const response = await ky.head(INSTALLER, { headers: { referer: REFERER } });
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) throw new Error(`No entity tag or last-modified for ${INSTALLER}`);

	// komac cannot download the installer either, so a new build stops the run:
	// this shard reports one, and the mirror the manifest points at is refreshed
	// by hand. The self-extracting wrapper is 32-bit, but its tool is x64 only.
	return {
		version: { source: 'product' },
		urls: () => [{ url: INSTALLER, architecture: 'x64' }],
		state,
	};
});
