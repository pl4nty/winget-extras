import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The site's download button serves the current release from an unversioned URL and
// names it in Content-Disposition. /builds/ also lists newer builds, so it is not used
// for the version, only for the per-version URL.
export default defineShard(async () => {
	const response = await ky.head('https://www.jawset.com/public_download/jawset.postshot/win/');

	const version = match(
		response.headers.get('content-disposition') ?? '',
		/Postshot-(\d+(?:\.\d+)+)\.exe/i,
	).groups[0];
	const urls = () => [`https://www.jawset.com/builds/postshot/windows/${version}`];

	return {
		version,
		urls,
	};
});
