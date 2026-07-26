import { describe, expect, test } from 'bun:test';

import { encodingRule } from '@/scripts/manifest-linter/rules/file/encoding';
import { checkRule, messages } from '@/scripts/manifest-linter/rules/test-utils';
import { decodeManifestText } from '@/scripts/manifest-linter/text-encoding';

describe('manifest text encoding rule', () => {
	test('recognizes UTF-8 with and without a BOM', () => {
		expect(decodeManifestText(new TextEncoder().encode('Café'))).toEqual({
			text: 'Café',
			encoding: 'utf-8',
		});
		expect(decodeManifestText(Uint8Array.from([0xef, 0xbb, 0xbf, 0x41]))).toEqual({
			text: 'A',
			encoding: 'utf-8-bom',
		});
	});

	test('decodes encodings supported by autofix', () => {
		expect(decodeManifestText(Uint8Array.from([0x43, 0x61, 0x66, 0xe9]))).toEqual({
			text: 'Café',
			encoding: 'windows-1252',
		});
		expect(decodeManifestText(Uint8Array.from([0xff, 0xfe, 0x41, 0x00]))).toEqual({
			text: 'A',
			encoding: 'utf-16le',
		});
	});

	test('reports a fix for non-UTF-8 input', async () => {
		const issues = await checkRule(encodingRule, {
			sources: [
				{
					file: 'manifest.yaml',
					root: 'manifests',
					directory: '.',
					raw: 'Café',
					encoding: 'windows-1252',
				},
			],
		});
		expect(messages(issues)).toEqual(['manifest must be UTF-8 encoded']);
		expect(issues[0]?.fix).toEqual({ kind: 'contents', contents: 'Café' });
	});
});
