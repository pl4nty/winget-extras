import { defineShard } from 'anthelion';
import ky from 'ky';

// The download button's endpoint 302s to a signed CDN URL; the file itself is
// served without the key1/key2 query, so strip it to keep the URL stable.
// The x86 stub downloads the x64-only emulator, so pin x64.
export default defineShard(async () => {
	const info = await ky(
		'https://api.mumuplayer.com/api/website/download_version_info?usage=1',
	).json<{
		data: { platform: string; version: string }[];
	}>();
	const version = info.data.find((d) => d.platform === 'win')!.version;

	const res = await ky('https://api.mumuplayer.com/api/dl/win?channel=gw-overseas12', {
		redirect: 'manual',
		throwHttpErrors: false,
	});
	const location = new URL(res.headers.get('location')!);
	location.search = '';

	return { version, urls: () => [{ url: location.toString(), architecture: 'x64' }] };
});
