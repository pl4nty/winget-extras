import { expect, test } from 'bun:test';

import { analyze } from './lint-manifests.mjs';

const BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const HEADER =
	'# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.12.0.schema.json';
const BODY = `\r\nPackageIdentifier: Contoso.App\r\n`;

test('accepts a clean manifest', () => {
	const { issues, fixed } = analyze(Buffer.from(`${HEADER}${BODY}`, 'utf8'));
	expect(issues).toEqual([]);
	expect(fixed).toBe(`${HEADER}${BODY}`);
});

test('flags and strips a leading UTF-8 BOM', () => {
	const { issues, fixed } = analyze(Buffer.concat([BOM, Buffer.from(`${HEADER}${BODY}`, 'utf8')]));
	expect(issues).toEqual([{ line: 1, message: 'File starts with a UTF-8 BOM; remove it.' }]);
	expect(fixed).toBe(`${HEADER}${BODY}`);
});

test('flags and fixes a missing space in the header', () => {
	const { issues, fixed } = analyze(Buffer.from(`#yaml-language-server: x${BODY}`, 'utf8'));
	expect(issues).toEqual([
		{
			line: 1,
			message:
				"Missing space after '#' in the yaml-language-server header; use '# yaml-language-server:'.",
		},
	]);
	expect(fixed).toBe(`# yaml-language-server: x${BODY}`);
});

test('reports the correct line when the header is not first', () => {
	const buf = Buffer.from(`# Created with komac\r\n#yaml-language-server: x${BODY}`, 'utf8');
	const { issues } = analyze(buf);
	expect(issues).toEqual([
		{
			line: 2,
			message:
				"Missing space after '#' in the yaml-language-server header; use '# yaml-language-server:'.",
		},
	]);
});

test('fixes both problems at once and preserves CRLF', () => {
	const buf = Buffer.concat([BOM, Buffer.from(`#yaml-language-server: x${BODY}`, 'utf8')]);
	const { issues, fixed } = analyze(buf);
	expect(issues.map((i) => i.line)).toEqual([1, 1]);
	expect(fixed).toBe(`# yaml-language-server: x${BODY}`);
	expect(fixed).toContain('\r\n');
});
