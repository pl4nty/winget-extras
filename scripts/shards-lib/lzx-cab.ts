/**
 * Reads files from a single-folder LZX cabinet. fflate only handles MSZIP, and some vendor catalogs
 * (Dell SupportAssist) ship LZX-compressed. Follows the decoder in libmspack's lzxd.c.
 */

const extraBits: number[] = [];
const positionBase: number[] = [];
for (let i = 0, bits = 0; i < 51; i += 2) {
	extraBits[i] = extraBits[i + 1] = bits;
	if (i !== 0 && bits < 17) bits++;
}
for (let i = 0, base = 0; i < 51; i++) {
	positionBase[i] = base;
	base += 1 << extraBits[i]!;
}

const positionSlots: Record<number, number> = {
	15: 30,
	16: 32,
	17: 34,
	18: 36,
	19: 38,
	20: 42,
	21: 50,
};

class Huffman {
	private counts = new Uint16Array(17);
	private symbols: Uint16Array;

	constructor(lengths: ArrayLike<number>) {
		this.symbols = new Uint16Array(lengths.length);
		for (let i = 0; i < lengths.length; i++) this.counts[lengths[i]!]!++;
		this.counts[0] = 0;
		const offsets = new Uint16Array(17);
		for (let length = 1; length < 16; length++) {
			offsets[length + 1] = offsets[length]! + this.counts[length]!;
		}
		for (let symbol = 0; symbol < lengths.length; symbol++) {
			if (lengths[symbol]) this.symbols[offsets[lengths[symbol]!]!++] = symbol;
		}
	}

	decode(bits: BitReader): number {
		let code = 0;
		let first = 0;
		let index = 0;
		for (let length = 1; length <= 16; length++) {
			code |= bits.read(1);
			const count = this.counts[length]!;
			if (code - count < first) return this.symbols[index + (code - first)]!;
			index += count;
			first = (first + count) << 1;
			code <<= 1;
		}
		throw new Error('Invalid Huffman code');
	}
}

/** LZX bitstream: 16-bit little-endian words, consumed most significant bit first. */
class BitReader {
	private position = 0;
	private word = 0;
	private bitsLeft = 0;

	constructor(private data: Uint8Array) {}

	read(count: number): number {
		let value = 0;
		for (let i = 0; i < count; i++) {
			if (this.bitsLeft === 0) {
				this.word = (this.data[this.position] ?? 0) | ((this.data[this.position + 1] ?? 0) << 8);
				this.position += 2;
				this.bitsLeft = 16;
			}
			this.bitsLeft--;
			value = (value << 1) | ((this.word >> this.bitsLeft) & 1);
		}
		return value;
	}

	/** Skips to the next 16-bit boundary, or a whole word if already on one. */
	alignForUncompressed(): void {
		if (this.bitsLeft === 0) this.position += 2;
		this.bitsLeft = 0;
	}

	byte(): number {
		return this.data[this.position++] ?? 0;
	}

	int32(): number {
		const value = new DataView(this.data.buffer, this.data.byteOffset + this.position, 4).getUint32(
			0,
			true,
		);
		this.position += 4;
		return value;
	}
}

class LzxDecoder {
	private output: number[] = [];
	private mainLengths: Uint8Array;
	private lengthLengths = new Uint8Array(249);
	private main?: Huffman;
	private length?: Huffman;
	private aligned?: Huffman;
	private repeats = [1, 1, 1];
	private headerRead = false;
	private blockType = 0;
	private blockLength = 0;
	private blockRemaining = 0;
	intelFileSize = 0;
	intelStarted = false;

	constructor(windowBits: number) {
		const slots = positionSlots[windowBits];
		if (!slots) throw new Error(`Unsupported LZX window size 2^${windowBits}`);
		this.mainLengths = new Uint8Array(256 + slots * 8);
	}

	private readLengths(bits: BitReader, lengths: Uint8Array, first: number, last: number): void {
		const pretreeLengths = new Uint8Array(20);
		for (let i = 0; i < 20; i++) pretreeLengths[i] = bits.read(4);
		const pretree = new Huffman(pretreeLengths);
		for (let x = first; x < last;) {
			let symbol = pretree.decode(bits);
			if (symbol === 17 || symbol === 18) {
				let run = symbol === 17 ? bits.read(4) + 4 : bits.read(5) + 20;
				while (run-- > 0) lengths[x++] = 0;
			} else if (symbol === 19) {
				let run = bits.read(1) + 4;
				symbol = pretree.decode(bits);
				const value = (lengths[x]! - symbol + 17) % 17;
				while (run-- > 0) lengths[x++] = value;
			} else {
				lengths[x] = (lengths[x]! - symbol + 17) % 17;
				x++;
			}
		}
	}

	private readBlockHeader(bits: BitReader): void {
		if (this.blockType === 3 && this.blockLength & 1) bits.byte();
		this.blockType = bits.read(3);
		this.blockLength = this.blockRemaining = (bits.read(16) << 8) | bits.read(8);
		if (this.blockType === 2) {
			const alignedLengths = new Uint8Array(8);
			for (let i = 0; i < 8; i++) alignedLengths[i] = bits.read(3);
			this.aligned = new Huffman(alignedLengths);
		}
		if (this.blockType === 1 || this.blockType === 2) {
			this.readLengths(bits, this.mainLengths, 0, 256);
			this.readLengths(bits, this.mainLengths, 256, this.mainLengths.length);
			this.main = new Huffman(this.mainLengths);
			if (this.mainLengths[0xe8]) this.intelStarted = true;
			this.readLengths(bits, this.lengthLengths, 0, 249);
			this.length = new Huffman(this.lengthLengths);
		} else if (this.blockType === 3) {
			this.intelStarted = true;
			bits.alignForUncompressed();
			this.repeats = [bits.int32(), bits.int32(), bits.int32()];
		} else {
			throw new Error(`Invalid LZX block type ${this.blockType}`);
		}
	}

	/** Decodes one cabinet data block, which holds one frame of `size` output bytes. */
	frame(data: Uint8Array, size: number): void {
		const bits = new BitReader(data);
		if (!this.headerRead) {
			if (bits.read(1)) this.intelFileSize = (bits.read(16) << 16) | bits.read(16);
			this.headerRead = true;
		}
		const end = this.output.length + size;
		const out = this.output;
		while (out.length < end) {
			if (this.blockRemaining === 0) this.readBlockHeader(bits);
			if (this.blockType === 3) {
				const run = Math.min(this.blockRemaining, end - out.length);
				for (let i = 0; i < run; i++) out.push(bits.byte());
				this.blockRemaining -= run;
				continue;
			}
			const start = out.length;
			while (out.length < end && out.length - start < this.blockRemaining) {
				const element = this.main!.decode(bits);
				if (element < 256) {
					out.push(element);
					continue;
				}
				let matchLength = (element - 256) & 7;
				if (matchLength === 7) matchLength += this.length!.decode(bits);
				matchLength += 2;
				const slot = (element - 256) >> 3;
				let offset: number;
				if (slot > 2) {
					const extra = extraBits[slot]!;
					offset = positionBase[slot]! - 2;
					if (slot === 3) {
						offset = 1;
					} else if (this.blockType === 2 && extra >= 3) {
						if (extra > 3) offset += bits.read(extra - 3) << 3;
						offset += this.aligned!.decode(bits);
					} else if (extra > 0) {
						offset += bits.read(extra);
					}
					this.repeats = [offset, this.repeats[0]!, this.repeats[1]!];
				} else {
					offset = this.repeats[slot]!;
					this.repeats[slot] = this.repeats[0]!;
					this.repeats[0] = offset;
				}
				if (offset > out.length) throw new Error('LZX match before start of output');
				for (let i = 0; i < matchLength; i++) out.push(out[out.length - offset]!);
			}
			this.blockRemaining -= out.length - start;
			if (this.blockRemaining < 0) throw new Error('LZX block overrun');
		}
	}

	result(frames: { start: number; size: number; intel: boolean }[]): Uint8Array {
		const out = Uint8Array.from(this.output);
		// Undo the encoder's E8 call translation
		for (const { start, size, intel } of frames) {
			if (!intel || !this.intelFileSize || size <= 10) continue;
			const view = new DataView(out.buffer);
			for (let i = 0; i < size - 10; i++) {
				if (out[start + i] !== 0xe8) continue;
				const position = start + i;
				const absolute = view.getInt32(position + 1, true);
				if (absolute >= -position && absolute < this.intelFileSize) {
					const relative = absolute >= 0 ? absolute - position : absolute + this.intelFileSize;
					view.setInt32(position + 1, relative, true);
				}
				i += 4;
			}
		}
		return out;
	}
}

/** Files in a single-folder LZX cabinet, keyed by name. */
export function readLzxCab(cab: Uint8Array): Map<string, Uint8Array> {
	const view = new DataView(cab.buffer, cab.byteOffset, cab.byteLength);
	if (new TextDecoder().decode(cab.subarray(0, 4)) !== 'MSCF') {
		throw new Error('Not a cabinet file');
	}

	let offset = 36;
	let dataReserve = 0;
	if (view.getUint16(30, true) & 4) {
		dataReserve = view.getUint8(39);
		offset += 4 + view.getUint16(36, true);
	}
	if (view.getUint16(26, true) !== 1) throw new Error('Expected a single folder');
	const compression = view.getUint16(offset + 6, true);
	if ((compression & 0xf) !== 3) throw new Error(`Expected LZX compression, got ${compression}`);

	const decoder = new LzxDecoder((compression >> 8) & 0x1f);
	const frames: { start: number; size: number; intel: boolean }[] = [];
	let position = view.getUint32(offset, true);
	let written = 0;
	for (let i = 0, count = view.getUint16(offset + 4, true); i < count; i++) {
		const compressedSize = view.getUint16(position + 4, true);
		const size = view.getUint16(position + 6, true);
		const start = position + 8 + dataReserve;
		decoder.frame(cab.subarray(start, start + compressedSize), size);
		frames.push({ start: written, size, intel: decoder.intelStarted });
		written += size;
		position = start + compressedSize;
	}
	const data = decoder.result(frames);

	const files = new Map<string, Uint8Array>();
	let entry = view.getUint32(16, true);
	for (let i = 0, count = view.getUint16(28, true); i < count; i++) {
		const size = view.getUint32(entry, true);
		const folderOffset = view.getUint32(entry + 4, true);
		const nameEnd = cab.indexOf(0, entry + 16);
		const name = new TextDecoder().decode(cab.subarray(entry + 16, nameEnd));
		files.set(name, data.subarray(folderOffset, folderOffset + size));
		entry = nameEnd + 1;
	}
	return files;
}
