import { expect, test } from 'bun:test';

import { yamlFilesRule } from '@/scripts/manifest-linter/rules/repository/yaml-files';
import { checkRule, entry, messages } from '@/scripts/manifest-linter/rules/test-utils';

test('YAML file rule rejects ambiguous directories and non-files', async () => {
	const issues = await checkRule(yamlFilesRule, {
		entries: [
			entry('manifests/a', 'Acme', 'directory'),
			entry('manifests/a', 'acme', 'directory'),
			entry('manifests/a/Acme', 'link.yaml', 'other'),
		],
	});
	expect(messages(issues)).toContain('directory name differs from Acme only by casing');
	expect(messages(issues)).toContain('manifest must be a regular file');
});
