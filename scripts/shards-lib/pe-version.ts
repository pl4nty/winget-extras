import { Inflate } from 'fflate';

/** Inflates the first entry of a (possibly truncated) zip. */
export function readFirstEntry(zip: Uint8Array): Uint8Array {
	const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
	if (view.getUint32(0, true) !== 0x04034b50 || view.getUint16(8, true) !== 8) {
		throw new Error('Expected a deflated zip entry at the start of the archive');
	}

	const start = 30 + view.getUint16(26, true) + view.getUint16(28, true);
	const chunks: Uint8Array[] = [];
	const inflate = new Inflate((chunk) => chunks.push(chunk));
	inflate.push(zip.subarray(start));

	const result = new Uint8Array(chunks.reduce((sum, chunk) => sum + chunk.length, 0));
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.length;
	}
	return result;
}

/** Reads the VS_FIXEDFILEINFO product version from a PE file's RT_VERSION resource. */
export function readProductVersion(pe: Uint8Array): string {
	const view = new DataView(pe.buffer, pe.byteOffset, pe.byteLength);
	const peOffset = view.getUint32(0x3c, true);
	if (view.getUint32(peOffset, true) !== 0x00004550) {
		throw new Error('Not a PE file');
	}

	const sectionCount = view.getUint16(peOffset + 6, true);
	const optionalOffset = peOffset + 24;
	const isPe32Plus = view.getUint16(optionalOffset, true) === 0x20b;
	const resourceRva = view.getUint32(optionalOffset + (isPe32Plus ? 112 : 96) + 16, true);
	const sectionsOffset = optionalOffset + view.getUint16(peOffset + 20, true);

	const toOffset = (rva: number) => {
		for (let i = 0; i < sectionCount; i++) {
			const section = sectionsOffset + i * 40;
			const virtualAddress = view.getUint32(section + 12, true);
			const rawSize = view.getUint32(section + 16, true);
			if (rva >= virtualAddress && rva < virtualAddress + rawSize) {
				return view.getUint32(section + 20, true) + rva - virtualAddress;
			}
		}
		throw new Error(`RVA ${rva} is not in any section`);
	};

	const resourceBase = toOffset(resourceRva);
	// Descends one level of the resource tree, taking the entry with the given ID (or the first if omitted)
	const child = (directory: number, id?: number) => {
		const count = view.getUint16(directory + 12, true) + view.getUint16(directory + 14, true);
		for (let i = 0; i < count; i++) {
			const entry = directory + 16 + i * 8;
			if (id === undefined || view.getUint32(entry, true) === id) {
				const target = view.getUint32(entry + 4, true);
				return { target: target & 0x7fffffff, isDirectory: (target & 0x80000000) !== 0 };
			}
		}
		throw new Error('Resource entry not found');
	};

	const versions = child(resourceBase, 16);
	const names = child(resourceBase + versions.target);
	const languages = child(resourceBase + names.target);
	const dataEntry = resourceBase + languages.target;
	const data = toOffset(view.getUint32(dataEntry, true));

	// VS_VERSIONINFO header (6 bytes + "VS_VERSION_INFO\0" in UTF-16) is followed by VS_FIXEDFILEINFO
	for (let offset = data; offset < data + 128; offset += 4) {
		if (view.getUint32(offset, true) === 0xfeef04bd) {
			const ms = view.getUint32(offset + 16, true);
			const ls = view.getUint32(offset + 20, true);
			return [ms >>> 16, ms & 0xffff, ls >>> 16, ls & 0xffff].join('.');
		}
	}
	throw new Error('VS_FIXEDFILEINFO not found');
}
