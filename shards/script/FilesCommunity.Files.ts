import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The CDN 403s ky's default User-Agent from CI (Cloudflare bot protection), so
// send a plain one. The appinstaller is the vendor's own update feed.
export default defineShard(async () => {
	const xml = await ky('https://cdn.files.community/files/stable/Files.Package.appinstaller', {
		headers: { 'User-Agent': 'curl/8.0' },
	}).text();

	const {
		groups: [version, url],
	} = match(
		xml,
		/<MainBundle[^>]*?\sVersion="(?<version>\d+(?:\.\d+)+)"[^>]*?\sUri="(?<url>https:\/\/[^"]+\.msixbundle)"/s,
	);

	return { version, urls: () => [url] };
});
