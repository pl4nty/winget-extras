import { createHash } from 'node:crypto';

import { defineShard } from 'anthelion';
import ky from 'ky';

const url = 'https://print.stamps.com/Webpostage/resources_connect_download/Stamps.com.Connect.exe';

// The installer URL is unversioned and sends no ETag or Last-Modified, so the
// version is only known after komac analyzes the file. Hash the installer as
// the state token, otherwise every run resubmits the same version. Akamai 403s
// Bun's and curl's default User-Agents, so send a plain one.
export default defineShard(async () => {
	const installer = await ky(url, { headers: { 'User-Agent': 'winget-extras' } }).arrayBuffer();
	const state = createHash('sha256').update(new Uint8Array(installer)).digest('hex');

	return {
		version: { source: 'file' },
		urls: () => [url],
		replace: true,
		state,
	};
});
