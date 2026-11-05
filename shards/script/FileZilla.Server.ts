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
	let page = await ky('https://filezilla-project.org/download.php?type=server&show_all=1', {
		headers,
	}).text();

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

	const link =
		/href=["'](?<url>https:\/\/[a-z\d.-]+\.filezilla-project\.org\/server\/FileZilla_Server_(?<version>\d+(?:\.\d+)+)_win64-setup\.exe(?:\?[^"']*)?)["']/i.exec(
			page,
		)?.groups;
	if (!link?.version || !link.url) {
		throw new Error('Official FileZilla Server download page did not expose a win64 installer');
	}
	const { version } = link;
	const url = link.url.replaceAll('&amp;', '&');

	return {
		version,
		urls: async () => [
			await mirrorFile(
				'FileZilla.Server',
				version,
				`FileZilla_Server_${version}_win64-setup.exe`,
				() => ky(url, { headers }),
			),
		],
	};
});
