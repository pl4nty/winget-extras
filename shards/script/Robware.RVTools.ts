import { defineShard } from 'anthelion';
import ky from 'ky';

// Dell's Akamai 403s browser and default User-Agents on this KB article, so send a plain one.
export default defineShard(async () => {
	const page = await ky('https://www.dell.com/support/kbdoc/en-us/000325532', {
		headers: { 'User-Agent': 'winget-extras' },
	}).text();
	const version = /rvtools(\d+(?:\.\d+)+)\.msi/i.exec(page)?.[1];
	if (!version) {
		throw new Error('No RVTools installer link found');
	}

	return { version, urls: () => [`https://downloads.dell.com/rvtools/RVTools${version}.msi`] };
});
