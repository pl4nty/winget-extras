import { expect, test } from 'bun:test';

import { returnCodesRule } from '@/scripts/manifest-linter/rules/installer/return-codes';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

test('return code rule compares signed and unsigned forms', async () => {
	const issues = await checkInstallerRule(returnCodesRule, {
		InstallerType: 'exe',
		InstallerSuccessCodes: [-1],
		ExpectedReturnCodes: [{ InstallerReturnCode: 4_294_967_295, ReturnResponse: 'custom' }],
	});
	expect(messages(issues)).toEqual(['duplicate installer return code']);
});
