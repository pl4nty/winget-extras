import { describe, expect, test } from 'bun:test';

import { parseManifest } from '@/scripts/manifest-linter/parser';
import type { ReportedDiagnostic } from '@/scripts/manifest-linter/types';

const VALID_VERSION_MANIFEST = `
PackageIdentifier: Example.Package
PackageVersion: '1.0'
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.28.0
`;

function parse(raw: string): {
	manifest: ReturnType<typeof parseManifest>;
	diagnostics: ReportedDiagnostic[];
} {
	const diagnostics: ReportedDiagnostic[] = [];
	const manifest = parseManifest('manifest.yaml', raw, (diagnostic) => {
		diagnostics.push(diagnostic);
	});
	return { manifest, diagnostics };
}

describe('manifest parser', () => {
	test('parses and validates a manifest with Anthelion Komac', () => {
		const result = parse(VALID_VERSION_MANIFEST);
		expect(result.diagnostics).toEqual([]);
		expect(result.manifest).toMatchObject({
			PackageIdentifier: 'Example.Package',
			PackageVersion: '1.0',
			ManifestType: 'version',
		});
	});

	test('retains detailed source ranges for invalid YAML', () => {
		const result = parse(
			VALID_VERSION_MANIFEST.replace(
				'PackageVersion:',
				'PackageIdentifier: Duplicate\nPackageVersion:',
			),
		);
		expect(result.manifest).toBeUndefined();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]?.message).toBe(
			'invalid YAML: duplicate mapping key: PackageIdentifier, set DuplicateKeyPolicy in Options if acceptable',
		);
		expect(result.diagnostics[0]?.message).not.toContain('\n');
		expect(result.diagnostics[0]?.location?.start.line).toBeGreaterThan(1);
	});

	test('reports syntax errors without embedding a second code frame', () => {
		const result = parse(`${VALID_VERSION_MANIFEST}invalid\n`);
		expect(result.manifest).toBeUndefined();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]?.message).toBe("invalid YAML: simple key expected ':'");
		expect(result.diagnostics[0]?.message).not.toContain('<input>');
	});

	test('continues to report schema errors after parsing', () => {
		const result = parse(`${VALID_VERSION_MANIFEST}Unexpected: true\n`);
		expect(result.manifest).toBeUndefined();
		expect(result.diagnostics).toContainEqual({
			file: 'manifest.yaml',
			message: 'property "Unexpected" is not allowed',
			search: 'Unexpected',
		});
	});
});
