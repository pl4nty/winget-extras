import { join } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

export const yamlFilesRule = defineRule({
	id: 'repository/yaml-files',
	check({ entries, report }) {
		const siblingDirectories = new Map<string, Map<string, string>>();

		for (const { entry } of entries) {
			const path = join(entry.parentPath, entry.name);
			if (entry.isDirectory()) {
				const siblings = siblingDirectories.get(entry.parentPath) ?? new Map<string, string>();
				const folded = entry.name.toLowerCase();
				const previous = siblings.get(folded);
				if (previous && previous !== entry.name) {
					report({ file: path, message: `directory name differs from ${previous} only by casing` });
				} else siblings.set(folded, entry.name);
				siblingDirectories.set(entry.parentPath, siblings);
			} else if (!entry.isFile() && entry.name.endsWith('.yaml')) {
				report({ file: path, message: 'manifest must be a regular file' });
			}
		}
	},
});
