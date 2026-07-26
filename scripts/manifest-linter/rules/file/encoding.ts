import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

export const encodingRule = defineRule({
	id: 'file/encoding',
	check({ sources, report }) {
		for (const source of sources) {
			if (source.encoding === 'utf-8') continue;
			report({
				file: source.file,
				message:
					source.encoding === 'utf-8-bom'
						? 'UTF-8 BOM is not allowed'
						: 'manifest must be UTF-8 encoded',
				fix: { kind: 'contents', contents: source.raw },
			});
		}
	},
});
