import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Canon Europe's support pages are bot-blocked; Canon Asia lists the same English MFDriver
// package and links it through a pdisp redirector that resolves to the gdlp01 file.
export default defineShard(async () => {
	const html = await ky('https://asia.canon/en/support/0100367301').text();

	const {
		groups: [id, version],
	} = match(
		html,
		/WWUFORedirectTarget\.do\?id=(?<id>[A-Za-z0-9+/=]+)[\s\S]*?File version : V(?<version>\d+(?:\.\d+)+)/,
	);

	const response = await ky(
		`https://pdisp01.c-wss.com/gdl/WWUFORedirectTarget.do?id=${id}&cmp=ACB&lang=EN`,
		{
			redirect: 'manual',
			throwHttpErrors: false,
		},
	);
	const url = response.headers.get('location');
	if (!url?.startsWith('https://gdlp01.c-wss.com/')) throw new Error(`Unexpected redirect: ${url}`);

	return { version, urls: () => [url] };
});
