import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The downloads page versions Flashpoint Infinity, but its "Download Installer" link is
// the FlashpointComponentTools latest-release redirect, whose own tag (1.x) moves
// independently. Pin the URL to the tag it currently resolves to so a new installer
// release doesn't silently change the hash under an unchanged Infinity version.
export default defineShard(async () => {
	const page = await ky('https://flashpointarchive.org/downloads').text();

	const version = match(page, /Flashpoint Infinity (\d+(?:\.\d+)+)\s*</).groups[0];
	const latestUrl = match(
		page,
		/href="(https:\/\/github\.com\/FlashpointProject\/FlashpointComponentTools\/releases\/[^"]*\/FlashpointInstaller\.exe)"/,
	).groups[0];

	const response = await fetch(latestUrl, { method: 'HEAD', redirect: 'manual' });
	const location = response.headers.get('location') ?? latestUrl;
	const url = match(
		location,
		/^(https:\/\/github\.com\/FlashpointProject\/FlashpointComponentTools\/releases\/download\/[^/]+\/FlashpointInstaller\.exe)$/,
	).groups[0];

	return { version, urls: () => [url] };
});
