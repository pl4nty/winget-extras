import { expect, test } from 'bun:test';
import { join } from 'node:path';

import { manifestPathRule } from '@/scripts/manifest-linter/rules/repository/manifest-path';
import {
	IDENTIFIER,
	checkRule,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

test('manifest path rule validates the directory and filename together', async () => {
	const directory = join('fonts', 'a', 'Acme', 'App', 'wrong-version');
	const issues = await checkRule(manifestPathRule, {
		records: [
			record('installer', {
				root: 'fonts',
				directory,
				file: join(directory, 'Wrong.installer.yaml'),
			}),
		],
	});
	expect(messages(issues)).toEqual(['manifest path does not match PackageVersion']);
	expect(issues[0]?.hints).toContain(`rename the file to ${IDENTIFIER}.installer.yaml`);
	expect(issues[0]?.hints?.some((hint) => hint.startsWith('move the manifest to fonts/'))).toBe(
		true,
	);
});
