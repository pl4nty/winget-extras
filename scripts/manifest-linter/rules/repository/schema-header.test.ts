import { expect, test } from 'bun:test';

import { schemaHeaderRule } from '@/scripts/manifest-linter/rules/repository/schema-header';
import { checkRule, record } from '@/scripts/manifest-linter/rules/test-utils';

test('schema header rule reports a directly applicable replacement', async () => {
	const issues = await checkRule(schemaHeaderRule, {
		records: [record('installer', { raw: '# yaml-language-server: old\n' })],
	});
	expect(issues).toHaveLength(1);
	expect(issues[0]?.message).toStartWith('schema header must be exactly:');
	expect(issues[0]?.fix).toEqual({
		kind: 'replacement',
		from: '# yaml-language-server: old',
		to: '# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.28.0.schema.json',
	});
});
