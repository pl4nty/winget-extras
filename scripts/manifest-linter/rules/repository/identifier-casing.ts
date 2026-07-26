import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

export const identifierCasingRule = defineRule({
	id: 'repository/identifier-casing',
	check({ records, report }) {
		const packageCasings = new Map<string, string>();
		for (const record of records) {
			const identifier = record.manifest.PackageIdentifier;
			const key = identifier.toLowerCase();
			const casing = packageCasings.get(key);
			if (casing && casing !== identifier) {
				report({
					file: record.file,
					message: `PackageIdentifier casing differs from ${casing}`,
				});
			} else packageCasings.set(key, identifier);
		}
	},
});
