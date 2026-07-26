import { expect, test } from 'bun:test';

import { switchesRule } from '@/scripts/manifest-linter/rules/installer/switches';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

test('switch rule validates MSI properties and syntax', async () => {
	const issues = await checkInstallerRule(switchesRule, {
		InstallerType: 'msi',
		InstallerSwitches: {
			Blocked: 'TRANSFORMS=bad.mst',
			Invalid: '/x',
		},
	});
	expect(messages(issues)).toEqual([
		'blocked MSI property TRANSFORMS',
		'InstallerSwitches contains invalid MSI switches',
	]);
});
