import { createDecipheriv } from 'node:crypto';

import { defineShard } from 'anthelion';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

const headers = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	Referer: 'https://filezilla-project.org/',
};

export default defineShard(async () => {
	let page = await ky('https://filezilla-project.org/download.php?show_all=1', { headers }).text();

	// The official page renders its download links from an AES-CBC content wrapper.
	const wrapper =
		/<div hidden id="contentwrapper" v1="([^"]+)" v2="([^"]+)" v3="[^"]+">([^<]+)<\/div>/.exec(
			page,
		);
	if (wrapper) {
		const [, iv, key, ciphertext] = wrapper;
		if (!iv || !key || !ciphertext) {
			throw new Error('Official FileZilla page has an incomplete encrypted content wrapper');
		}
		const decipher = createDecipheriv(
			'aes-256-cbc',
			Buffer.from(key, 'base64'),
			Buffer.from(iv, 'base64'),
		);
		page = Buffer.concat([
			decipher.update(Buffer.from(ciphertext, 'base64')),
			decipher.final(),
		]).toString('utf8');
	}

	const links = [
		...page.matchAll(
			/href=["'](?<url>https:\/\/[a-z\d.-]+\.filezilla-project\.org\/client\/FileZilla_(?<version>\d+(?:\.\d+)+)_(?<platform>win32|win64)-setup\.exe(?:\?[^"']*)?)["']/gi,
		),
	];
	const installers = (['win32', 'win64'] as const).map((platform) => {
		const { version, url: downloadUrl } =
			links.find((link) => link.groups?.platform === platform)?.groups ?? {};
		if (!version || !downloadUrl) {
			throw new Error(`Official FileZilla download page did not expose a ${platform} installer`);
		}
		return {
			version,
			url: downloadUrl.replaceAll('&amp;', '&'),
			file: `FileZilla_${version}_${platform}-setup.exe`,
		};
	});
	const version = installers[0]?.version;
	if (!version || installers.some((installer) => installer.version !== version)) {
		throw new Error('Official FileZilla Windows installers have different versions');
	}

	return {
		version,
		urls: async () =>
			Promise.all(
				installers.map(({ file, url }) =>
					mirrorFile('FileZilla.Client', version, file, () => ky(url, { headers })),
				),
			),
	};
});
