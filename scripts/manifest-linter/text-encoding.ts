import type { TextEncoding } from '@/scripts/manifest-linter/types';

export function decodeManifestText(bytes: Uint8Array): {
	text: string;
	encoding: TextEncoding;
} {
	const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
	try {
		return {
			text: new TextDecoder('utf-8', { fatal: true }).decode(bytes),
			encoding: hasUtf8Bom ? 'utf-8-bom' : 'utf-8',
		};
	} catch {
		if (bytes[0] === 0xff && bytes[1] === 0xfe) {
			return { text: new TextDecoder('utf-16').decode(bytes), encoding: 'utf-16le' };
		}
		if (bytes[0] === 0xfe && bytes[1] === 0xff) {
			const littleEndianBytes = Uint8Array.from(bytes);
			for (let index = 0; index + 1 < littleEndianBytes.length; index += 2) {
				[littleEndianBytes[index], littleEndianBytes[index + 1]] = [
					littleEndianBytes[index + 1] ?? 0,
					littleEndianBytes[index] ?? 0,
				];
			}
			return {
				text: new TextDecoder('utf-16').decode(littleEndianBytes),
				encoding: 'utf-16be',
			};
		}
		return {
			text: new TextDecoder('windows-1252').decode(bytes),
			encoding: 'windows-1252',
		};
	}
}
