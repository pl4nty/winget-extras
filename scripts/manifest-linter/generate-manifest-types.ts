import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import standaloneCode from 'ajv/dist/standalone/index.js';
import { Parser } from 'json-schema-to-dts';

const TYPES = ['installer', 'version', 'locale', 'defaultLocale'] as const;
const VERSIONS = ['1.9.0', '1.10.0', '1.12.0', '1.28.0'];
const OUTPUT = 'scripts/manifest-linter/generated';
const OXLINT_DISABLE = '/* oxlint-disable -- generated file */\n';
type ManifestType = (typeof TYPES)[number];

function typeName(type: ManifestType, version: string): string {
	const manifest =
		type === 'defaultLocale' ? 'DefaultLocale' : `${type[0]!.toUpperCase()}${type.slice(1)}`;
	return `${manifest}ManifestV${version.replaceAll('.', '_')}`;
}

function tightenInstallerSchema(schema: any): void {
	const definitions = schema.definitions;
	const approximateVersion = { type: 'string', pattern: '^\\s*[<>] ' };

	definitions.Channel.enum = [null];
	schema.properties.PackageVersion = {
		allOf: [schema.properties.PackageVersion, { not: approximateVersion }],
	};
	definitions.AppsAndFeaturesEntry.properties.DisplayVersion.not = approximateVersion;
	definitions.Dependencies.properties.WindowsFeatures.items.pattern = '^[A-Za-z0-9_-]+$';
	for (const property of Object.values(definitions.InstallerSwitches.properties) as any[]) {
		property.not = { type: 'string', pattern: String.raw`\\\\` };
	}
	if (definitions.Authentication) {
		definitions.Authentication.properties.AuthenticationType.const = 'none';
	}
	if (definitions.DesiredStateConfiguration) {
		definitions.DesiredStateConfiguration.properties.PowerShell.maxItems = 0;
	}
	schema.if = {
		anyOf: [
			{ not: { required: ['InstallerType'] } },
			{ required: ['InstallerType'], properties: { InstallerType: { type: 'null' } } },
		],
	};
	// oxlint-disable-next-line unicorn/no-thenable -- `then` is a JSON Schema keyword.
	Reflect.set(schema, 'then', {
		properties: {
			Installers: {
				items: {
					required: ['InstallerType'],
					properties: { InstallerType: { type: 'string' } },
				},
			},
		},
	});
}

const entries = await Promise.all(
	VERSIONS.flatMap((version) =>
		TYPES.map(async (type) => {
			const url = `https://aka.ms/winget-manifest.${type}.${version}.schema.json`;
			const response = await fetch(url);
			if (!response.ok) throw new Error(`Could not download ${url}: HTTP ${response.status}`);

			const schema = JSON.parse(await response.text(), (_key, value) => {
				if (value?.type === 'object' || value?.properties) value.additionalProperties = false;
				return value;
			});
			schema.title = typeName(type, version);
			schema.properties.ManifestVersion.const = version;
			if (type === 'installer') tightenInstallerSchema(schema);
			if (type === 'locale' || type === 'defaultLocale') {
				schema.definitions.Agreement.anyOf = ['AgreementLabel', 'Agreement', 'AgreementUrl'].map(
					(field) => ({
						type: 'object',
						required: [field],
						properties: { [field]: { type: 'string', pattern: '\\S' } },
					}),
				);
			}
			if (type === 'defaultLocale' && !schema.required.includes('Moniker')) {
				schema.required.push('Moniker');
			}
			return {
				type,
				version,
				url,
				schema,
				validator: `validate_${type}_${version.replaceAll('.', '_')}`,
			};
		}),
	),
);

const parser = new Parser();
const ajv = new Ajv({
	allErrors: true,
	formats: { long: true },
	strict: false,
	code: { esm: true, source: true },
});
addFormats(ajv);

for (const entry of entries) {
	parser.addSchema(entry.url, entry.schema);
	ajv.addSchema(entry.schema, entry.validator);
}

for (const [title, types] of Object.entries({
	WingetManifest: TYPES,
	InstallerManifest: ['installer'],
	LocalizationManifest: ['locale', 'defaultLocale'],
})) {
	parser.addSchema(`urn:${title}`, {
		title,
		oneOf: entries.filter(({ type }) => types.includes(type)).map(({ url }) => ({ $ref: url })),
	});
}

const generated = parser.compile({
	topLevel: { isExported: true },
	lifted: { isExported: true },
});
if (generated.diagnostics.length) {
	throw new Error('Type generation failed', { cause: generated.diagnostics });
}

await mkdir(OUTPUT, { recursive: true });
await Promise.all([
	writeFile(join(OUTPUT, 'manifest-types.d.ts'), OXLINT_DISABLE + generated.text),
	writeFile(join(OUTPUT, 'manifest-validators.js'), OXLINT_DISABLE + standaloneCode(ajv)),
]);
console.log(`Generated ${entries.length} WinGet manifest types and validators in ${OUTPUT}.`);
