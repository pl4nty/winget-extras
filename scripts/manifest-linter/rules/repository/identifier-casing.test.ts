import { expect, test } from 'bun:test';

import { identifierCasingRule } from '@/scripts/manifest-linter/rules/repository/identifier-casing';
import { checkRule, manifest, messages, record } from '@/scripts/manifest-linter/rules/test-utils';

test('identifier casing rule compares packages case-insensitively', async () => {
	const changed = manifest('installer');
	changed.PackageIdentifier = 'acme.App';
	const issues = await checkRule(identifierCasingRule, {
		records: [record('version'), record('installer', { manifest: changed })],
	});
	expect(messages(issues)).toEqual(['PackageIdentifier casing differs from Acme.App']);
});
