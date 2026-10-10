import { inflateRawSync } from 'node:zlib';

import { defineShard } from 'anthelion';
import ky from 'ky';

const url = 'https://downloads.wdc.com/wdapp/WDDriveUtilities_WIN.zip';

// WD publishes the installer at a fixed URL. The zip's first entry is a UTF-16 manifest.json carrying the
// version, so a short range request is enough to read it without downloading the installer
export default defineShard(async () => {
	const response = await ky(url, { headers: { range: 'bytes=0-1023' } });
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const zip = Buffer.from(await response.arrayBuffer());
	if (zip.readUInt32LE(0) !== 0x04034b50) {
		throw new Error('Unexpected zip local file header');
	}
	const method = zip.readUInt16LE(8);
	const size = zip.readUInt32LE(18);
	const dataStart = 30 + zip.readUInt16LE(26) + zip.readUInt16LE(28);
	const data = zip.subarray(dataStart, dataStart + size);
	const raw = method === 8 ? inflateRawSync(data) : data;

	const text = new TextDecoder(raw[0] === 0xff && raw[1] === 0xfe ? 'utf-16le' : 'utf-8').decode(
		raw,
	);
	const version = (JSON.parse(text.replace(/^﻿/, '')) as { version?: string }).version;
	if (!version) {
		throw new Error('No version in manifest.json');
	}

	return { version, urls: () => [url], state };
});
