import { defineShard } from 'anthelion';
import ky from 'ky';

const url = 'https://print.stamps.com/Webpostage/resources_connect_download/Stamps.com.Connect.exe';

// The installer URL is unversioned and sends no ETag or Last-Modified, so the
// version is only known after komac analyzes the file. Use Content-Length as
// the state token, otherwise every run resubmits the same version. Akamai 403s
// Bun's and curl's default User-Agents, so send a plain one.
export default defineShard(async () => {
	const response = await ky.head(url, { headers: { 'User-Agent': 'winget-extras' } });
	const state = response.headers.get('content-length');
	if (!state) {
		throw new Error('No Content-Length header found');
	}

	return {
		version: { source: 'file' },
		urls: () => [url],
		replace: true,
		state,
	};
});
