import { createDecipheriv } from 'node:crypto';

import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

const headers = {
	'User-Agent':
		'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
	Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
	Referer: 'https://filezilla-project.org/',
};

/** Latest Windows installers from the official download page, mirrored because their URLs are signed. */
export async function fileZilla(
	packageIdentifier: string,
	type: 'client' | 'server',
	platforms: string[],
) {
	let page = await ky(`https://filezilla-project.org/download.php?type=${type}&show_all=1`, {
		headers,
	}).text();

	// The official page renders its download links from an AES-CBC content wrapper.
	const wrapper =
		/<div hidden id="contentwrapper" v1="([^"]+)" v2="([^"]+)" v3="[^"]+">([^<]+)<\/div>/.exec(
			page,
		);
	if (wrapper) {
		const [, iv, key, ciphertext] = wrapper;
		const decipher = createDecipheriv(
			'aes-256-cbc',
			Buffer.from(key!, 'base64'),
			Buffer.from(iv!, 'base64'),
		);
		page = Buffer.concat([
			decipher.update(Buffer.from(ciphertext!, 'base64')),
			decipher.final(),
		]).toString('utf8');
	}

	const prefix = type === 'server' ? 'FileZilla_Server' : 'FileZilla';
	const installers = platforms.map((platform) => {
		const [, url, file, version] =
			new RegExp(
				`href=["'](https://[a-z\\d.-]+\\.filezilla-project\\.org/${type}/(${prefix}_(\\d+(?:\\.\\d+)+)_${platform}-setup\\.exe)(?:\\?[^"']*)?)["']`,
				'i',
			).exec(page) ?? [];
		if (!url || !file || !version) {
			throw new Error(
				`Official FileZilla download page did not expose a ${type} ${platform} installer`,
			);
		}
		return { url: url.replaceAll('&amp;', '&'), file, version };
	});
	const version = installers[0]!.version;
	if (installers.some((installer) => installer.version !== version)) {
		throw new Error(`Official FileZilla ${type} installers have different versions`);
	}

	return {
		version,
		urls: async () =>
			Promise.all(
				installers.map(({ file, url }) =>
					mirrorFile(packageIdentifier, version, file, () => ky(url, { headers })),
				),
			),
	};
}
