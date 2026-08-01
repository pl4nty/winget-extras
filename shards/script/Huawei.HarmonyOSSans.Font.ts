import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Huawei does not provide ETag or Last-Modified headers for this rolling URL.
// Read the ZIP central directory and use its stored font CRCs as a cheap state
// token instead of downloading and hashing the 52 MB archive on every run.
export default defineShard(async () => {
	const url = 'https://developer.huawei.com/images/download/general/HarmonyOS-Sans.zip';
	const response = await ky(url, {
		headers: { range: 'bytes=-65557' },
	});
	const bytes = new Uint8Array(await response.arrayBuffer());
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const {
		groups: [rangeStartValue],
	} = match(response.headers.get('content-range'), /^bytes (\d+)-\d+\/\d+$/i);
	const rangeStart = Number(rangeStartValue);

	let endOfCentralDirectory = -1;
	for (let offset = bytes.length - 22; offset >= 0; offset--) {
		if (view.getUint32(offset, true) === 0x06_05_4b_50) {
			endOfCentralDirectory = offset;
			break;
		}
	}
	if (endOfCentralDirectory === -1) {
		throw new Error('No ZIP end-of-central-directory record found');
	}

	const directorySize = view.getUint32(endOfCentralDirectory + 12, true);
	const directoryOffset = view.getUint32(endOfCentralDirectory + 16, true) - rangeStart;
	if (directoryOffset < 0 || directoryOffset + directorySize > bytes.length) {
		throw new Error('ZIP central directory is outside the requested range');
	}

	const decoder = new TextDecoder();
	const entries: [name: string, crc: string][] = [];
	for (let offset = directoryOffset; offset < directoryOffset + directorySize;) {
		if (view.getUint32(offset, true) !== 0x02_01_4b_50) {
			throw new Error('Invalid ZIP central-directory entry');
		}

		const nameLength = view.getUint16(offset + 28, true);
		const extraLength = view.getUint16(offset + 30, true);
		const commentLength = view.getUint16(offset + 32, true);
		const name = decoder.decode(bytes.subarray(offset + 46, offset + 46 + nameLength));
		if (/^HarmonyOS Sans\/HarmonyOS_Sans(?:_Italic)?\/HarmonyOS_Sans_[^/]+\.ttf$/i.test(name)) {
			const crc = view
				.getUint32(offset + 16, true)
				.toString(16)
				.padStart(8, '0');
			entries.push([name, crc]);
		}

		offset += 46 + nameLength + extraLength + commentLength;
	}
	if (entries.length === 0) {
		throw new Error('No HarmonyOS Sans fonts found in the ZIP central directory');
	}

	entries.sort(([a], [b]) => a.localeCompare(b));
	const state = entries.map(([, crc]) => crc).join('.');
	const version = { source: 'fontVersion' };
	const urls = () => [{ url, nestedInstallerMatches: ['HarmonyOS_Sans_'] }];

	return {
		version,
		urls,
		state,
		replace: true,
	};
});
