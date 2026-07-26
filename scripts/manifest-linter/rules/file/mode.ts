import { join } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

const EXPECTED_MODE = 0o644;

export const fileModeRule = defineRule({
	id: 'file/mode',
	check({ entries, report }) {
		for (const { entry, mode } of entries) {
			if (!entry.isFile() || mode === undefined || mode === EXPECTED_MODE) continue;
			const file = join(entry.parentPath, entry.name);
			report({
				file,
				message: `file mode must be 0644 (found 0${mode.toString(8)})`,
				fix: { kind: 'mode', mode: EXPECTED_MODE },
			});
		}
	},
});
