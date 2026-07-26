import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

export const schemaHeaderRule = defineRule({
	id: 'repository/schema-header',
	check({ records, report }) {
		for (const record of records) {
			const { manifest } = record;
			const expected = `# yaml-language-server: $schema=https://aka.ms/winget-manifest.${manifest.ManifestType}.${manifest.ManifestVersion}.schema.json`;
			const headers = record.raw
				.split(/\r?\n/)
				.filter((line) => line.includes('yaml-language-server:'));
			const header = headers.at(0);
			if (headers.length === 1 && header === expected) continue;
			report({
				file: record.file,
				message: `schema header must be exactly: ${expected}`,
				search: 'yaml-language-server',
				fix:
					headers.length === 1 && header !== undefined
						? { kind: 'replacement', from: header, to: expected }
						: undefined,
			});
		}
	},
});
