// Minimal PE version-resource reader for shards whose only version marker is
// the installer's own metadata. Lives outside shards/ because the Test workflow
// treats every changed file under shards/** as a package.

const RESOURCE_DIRECTORY = 2;
const RT_VERSION = 16;
const SUBDIRECTORY = 0x8000_0000;
const TEXT_VALUE = 1;

type Node = {
	/** Name of this node, such as `StringFileInfo` or `ProductVersion`. */
	key: string;
	/** Offset and byte length of the node's own value. */
	value: number;
	valueLength: number;
	/** Offsets bounding the node's children. */
	children: number;
	end: number;
};

/** The `ProductVersion` an image declares in its version resource. */
export function productVersion(image: Uint8Array): string {
	const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
	const base = versionResource(image, view);
	const root = readNode(view, base, base);

	for (const info of children(view, base, root)) {
		if (info.key !== 'StringFileInfo') continue;
		// One string table per language and code page, each holding the same keys.
		for (const table of children(view, base, info))
			for (const string of children(view, base, table)) {
				if (string.key !== 'ProductVersion') continue;
				const version = text(view, string.value, string.valueLength).trim();
				if (version) return version;
			}
	}
	throw new Error('No ProductVersion in the version resource');
}

/** File offset of the image's first version resource. */
function versionResource(image: Uint8Array, view: DataView): number {
	const headers = view.getUint32(0x3c, true);
	if (view.getUint32(headers, true) !== 0x0000_4550) throw new Error('Not a PE image');

	const coff = headers + 4;
	const sections = view.getUint16(coff + 2, true);
	const optional = coff + 20;
	// PE32+ replaces four 32-bit fields with 64-bit ones before the directories.
	const directories = optional + (view.getUint16(optional, true) === 0x20b ? 112 : 96);
	const table = view.getUint32(directories + RESOURCE_DIRECTORY * 8, true);
	if (!table) throw new Error('Image has no resource directory');

	const sectionTable = optional + view.getUint16(coff + 16, true);
	const offset = (rva: number) => sectionOffset(view, sectionTable, sections, rva);
	const root = offset(table);
	// Type, then name, then language: only the type is looked up by identifier.
	const name = root + (entry(view, root, RT_VERSION) & ~SUBDIRECTORY);
	const language = root + (entry(view, name) & ~SUBDIRECTORY);
	// The language level points at a data entry, which starts with its own RVA.
	return offset(view.getUint32(root + entry(view, language), true));
}

/** Where a resource directory entry points, by identifier or the first one. */
function entry(view: DataView, directory: number, id?: number): number {
	const named = view.getUint16(directory + 12, true);
	const total = named + view.getUint16(directory + 14, true);
	// Named entries sort before the identified ones this reader looks up.
	for (let index = id === undefined ? 0 : named; index < total; index++) {
		const offset = directory + 16 + index * 8;
		if (id !== undefined && view.getUint32(offset, true) !== id) continue;
		return view.getUint32(offset + 4, true);
	}
	throw new Error(`No resource directory entry for ${id ?? 'the first name'}`);
}

/** File offset of an RVA, resolved through the section table. */
function sectionOffset(view: DataView, sections: number, count: number, rva: number): number {
	for (let index = 0; index < count; index++) {
		const header = sections + index * 40;
		const start = view.getUint32(header + 12, true);
		if (rva < start || rva >= start + view.getUint32(header + 16, true)) continue;
		return view.getUint32(header + 20, true) + rva - start;
	}
	throw new Error(`No section contains RVA ${rva}`);
}

/** Reads one version-resource node, whose parts are aligned to four bytes. */
function readNode(view: DataView, base: number, offset: number): Node {
	const align = (position: number) => base + ((position - base + 3) & ~3);
	const length = view.getUint16(offset, true);
	// A text value counts characters rather than bytes.
	const declared = view.getUint16(offset + 2, true);
	const valueLength = view.getUint16(offset + 4, true) === TEXT_VALUE ? declared * 2 : declared;

	let cursor = offset + 6;
	let key = '';
	for (; view.getUint16(cursor, true) !== 0; cursor += 2)
		key += String.fromCharCode(view.getUint16(cursor, true));

	const value = align(cursor + 2);
	return { key, value, valueLength, children: align(value + valueLength), end: offset + length };
}

function* children(view: DataView, base: number, node: Node): Generator<Node> {
	let cursor = node.children;
	while (cursor < node.end) {
		const child = readNode(view, base, cursor);
		yield child;
		cursor = child.end === cursor ? node.end : base + ((child.end - base + 3) & ~3);
	}
}

/** A node's UTF-16 value, without its terminator. */
function text(view: DataView, offset: number, length: number): string {
	let value = '';
	for (let cursor = offset; cursor < offset + length; cursor += 2) {
		const unit = view.getUint16(cursor, true);
		if (unit === 0) break;
		value += String.fromCharCode(unit);
	}
	return value;
}
