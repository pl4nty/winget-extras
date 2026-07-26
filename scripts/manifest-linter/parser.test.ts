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

async function parse(raw: string): Promise<{
	manifest: Awaited<ReturnType<typeof parseManifest>>;
	diagnostics: ReportedDiagnostic[];
}> {
	const diagnostics: ReportedDiagnostic[] = [];
	const manifest = await parseManifest('manifest.yaml', raw, (diagnostic) => {
		diagnostics.push(diagnostic);
	});
	return { manifest, diagnostics };
}

describe('manifest parser', () => {
	test('parses and validates a manifest on the native fast path', async () => {
		const result = await parse(VALID_VERSION_MANIFEST);
		expect(result.diagnostics).toEqual([]);
		expect(result.manifest).toMatchObject({
			PackageIdentifier: 'Example.Package',
			PackageVersion: '1.0',
			ManifestType: 'version',
		});
	});

	test('retains detailed source ranges for invalid YAML', async () => {
		const result = await parse(
			VALID_VERSION_MANIFEST.replace(
				'PackageVersion:',
				'PackageIdentifier: Duplicate\nPackageVersion:',
			),
		);
		expect(result.manifest).toBeUndefined();
		expect(result.diagnostics).toHaveLength(1);
		expect(result.diagnostics[0]?.message).toStartWith('invalid YAML: Map keys must be unique');
		expect(result.diagnostics[0]?.location?.start.line).toBeGreaterThan(1);
	});

	test('continues to report schema errors after native parsing', async () => {
		const result = await parse(`${VALID_VERSION_MANIFEST}Unexpected: true\n`);
		expect(result.manifest).toBeUndefined();
		expect(result.diagnostics).toContainEqual({
			file: 'manifest.yaml',
			message: 'property "Unexpected" is not allowed',
			search: 'Unexpected',
		});
	});
});
