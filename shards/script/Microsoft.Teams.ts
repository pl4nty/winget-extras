import { inflateRawSync } from 'node:zlib';

import { defineShard } from 'anthelion';
import ky from 'ky';

// Microsoft publishes no version feed for the new Teams client, and komac finds no ProductVersion in
// an MSIX. The package identity version in AppxManifest.xml is the version, so read just that entry
// from the stable "lkg" MSIX with range requests instead of downloading ~280 MB. The MSIX is a
// zip64 archive, so the central directory is located through the zip64 end-of-directory record.
const lkg =
	'https://statics.teams.cdn.office.net/production-windows-x64/enterprise/webview2/lkg/MSTeams-x64.msix';

const range = async (bytes: string) =>
	Buffer.from(
		await ky(lkg, {
			headers: { Range: `bytes=${bytes}` },
			timeout: 60_000,
			retry: 3,
		}).arrayBuffer(),
	);

export default defineShard(async () => {
	const tail = await range('-65536');
	const eocd = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
	const locator = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x06, 0x07]), eocd);
	if (locator < 0) throw new Error('No zip64 end of central directory locator in the MSIX');

	const recordOffset = Number(tail.readBigUInt64LE(locator + 8));
	const record = await range(`${recordOffset}-${recordOffset + 55}`);
	const size = Number(record.readBigUInt64LE(40));
	const offset = Number(record.readBigUInt64LE(48));
	const directory = await range(`${offset}-${offset + size - 1}`);

	for (let p = 0; p + 46 <= directory.length && directory.readUInt32LE(p) === 0x02014b50;) {
		const nameLength = directory.readUInt16LE(p + 28);
		const name = directory.toString('utf8', p + 46, p + 46 + nameLength);
		if (name === 'AppxManifest.xml') {
			const method = directory.readUInt16LE(p + 10);
			const compressed = directory.readUInt32LE(p + 20);
			const entry = directory.readUInt32LE(p + 42);
			const header = await range(`${entry}-${entry + 29}`);
			const data = entry + 30 + header.readUInt16LE(26) + header.readUInt16LE(28);
			const body = await range(`${data}-${data + compressed - 1}`);
			const manifest = (method === 8 ? inflateRawSync(body) : body).toString('utf8');
			const version = manifest.match(/<Identity\b[^>]*\sVersion="([\d.]+)"/)?.[1];
			if (!version) throw new Error('No package identity version in AppxManifest.xml');

			const base = 'https://teamsinstaller.public.onecdn.static.microsoft';
			return {
				version,
				urls: () =>
					['x64', 'x86', 'arm64'].map(
						(arch) => `${base}/production-windows-${arch}/${version}/MSTeams-${arch}.msix`,
					),
			};
		}
		p += 46 + nameLength + directory.readUInt16LE(p + 30) + directory.readUInt16LE(p + 32);
	}
	throw new Error('No AppxManifest.xml in the MSIX');
});
