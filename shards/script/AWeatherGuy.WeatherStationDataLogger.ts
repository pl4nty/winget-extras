import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

export default defineShard(async () => {
	const page = await ky('https://wmrx00.sourceforge.net/', {
		timeout: 30_000,
		retry: { limit: 2, retryOnTimeout: true },
	}).text();
	const {
		groups: [version],
	} = match(page, /Version (\d+(?:\.\d+)+) is now the current stable release/i);

	return {
		version,
		urls: () => [
			`https://sourceforge.net/projects/wmrx00/files/1.%20Windows%20Install/${version}/WSDL-${version}-Installer.exe/download`,
		],
	};
});
