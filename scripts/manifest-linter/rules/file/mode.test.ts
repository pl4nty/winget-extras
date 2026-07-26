import { describe, expect, test } from 'bun:test';

import { fileModeRule } from '@/scripts/manifest-linter/rules/file/mode';
import { checkRule, entry } from '@/scripts/manifest-linter/rules/test-utils';

describe('file mode rule', () => {
	test('reports a 0644 mode fix for repository files', async () => {
		const issues = await checkRule(fileModeRule, {
			entries: [{ ...entry('manifests/a', 'manifest.yaml', 'file'), mode: 0o600 }],
		});
		expect(issues).toHaveLength(1);
		expect(issues[0]?.file).toBe('manifests/a/manifest.yaml');
		expect(issues[0]?.message).toBe('file mode must be 0644 (found 0600)');
		expect(issues[0]?.fix).toEqual({ kind: 'mode', mode: 0o644 });
	});
});
