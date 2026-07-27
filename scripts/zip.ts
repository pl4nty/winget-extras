import { inflateRawSync } from 'node:zlib';

// Minimal ZIP reader for shards that need a version from inside an archive.
// Lives outside shards/ because the Test workflow treats every changed file
// under shards/** as a package.

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_FILE_HEADER = 0x02014b50;
const STORED = 0;
const DEFLATED = 8;

/** Names of every file in the archive, in central-directory order. */
export function zipEntries(zip: Uint8Array): string[] {
	return [...walk(zip)].map(({ name }) => name);
}

/** Contents of the first entry whose name satisfies `match`. */
export function readZipEntry(zip: Uint8Array, match: (name: string) => boolean): Uint8Array {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	for (const { name, method, offset } of walk(zip)) {
		if (!match(name)) continue;
		// The central directory's sizes are authoritative, but the local header
		// is what precedes the data, and its name/extra lengths can differ.
		const nameLength = view.getUint16(offset + 26, true);
		const extraLength = view.getUint16(offset + 28, true);
		const start = offset + 30 + nameLength + extraLength;
		const data = zip.subarray(start, start + method.compressedSize);
		if (method.compression === STORED) return data;
		if (method.compression === DEFLATED) return new Uint8Array(inflateRawSync(data));
		throw new Error(`Unsupported ZIP compression method ${method.compression} for ${name}`);
	}
	throw new Error('No matching entry in archive');
}

function* walk(zip: Uint8Array) {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	let end = zip.length - 22;
	while (end >= 0 && view.getUint32(end, true) !== END_OF_CENTRAL_DIRECTORY) end--;
	if (end < 0) throw new Error('Not a ZIP archive');

	const count = view.getUint16(end + 10, true);
	let cursor = view.getUint32(end + 16, true);
	for (let i = 0; i < count; i++) {
		if (view.getUint32(cursor, true) !== CENTRAL_FILE_HEADER) throw new Error('Corrupt ZIP index');
		const compression = view.getUint16(cursor + 10, true);
		const compressedSize = view.getUint32(cursor + 20, true);
		const nameLength = view.getUint16(cursor + 28, true);
		const extraLength = view.getUint16(cursor + 30, true);
		const commentLength = view.getUint16(cursor + 32, true);
		const offset = view.getUint32(cursor + 42, true);
		const name = new TextDecoder().decode(zip.subarray(cursor + 46, cursor + 46 + nameLength));
		yield { name, offset, method: { compression, compressedSize } };
		cursor += 46 + nameLength + extraLength + commentLength;
	}
}
