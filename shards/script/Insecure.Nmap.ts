import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Nmap's download page regularly exceeds ky's default ten-second timeout.
export default defineShard(async () => {
	const page = await ky('https://nmap.org/download', {
		timeout: 60_000,
		retry: 3,
	}).text();

	const version = match(page, /dist\/nmap-(\d+(?:\.\d+)+)-setup\.exe/i).groups[0];
	const urls = () => [
		{
			url: `https://nmap.org/dist/nmap-${version}-setup.exe`,
			architecture: 'x86',
		},
	];

	return {
		version,
		urls,
	};
});
