import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

function normalizedReturnCode(value: number): number {
	return value < 0 ? value + 0x1_0000_0000 : value;
}

export const returnCodesRule = defineInstallerRule({
	id: 'installer/return-codes',
	check({ installers, report }) {
		for (const installer of installers) {
			const returnCodes = new Set<number>();
			for (const code of installer.InstallerSuccessCodes ?? []) {
				returnCodes.add(normalizedReturnCode(code));
			}
			for (const expected of installer.ExpectedReturnCodes ?? []) {
				const normalized = normalizedReturnCode(expected.InstallerReturnCode);
				if (returnCodes.has(normalized)) {
					report({ message: 'duplicate installer return code', search: 'ExpectedReturnCodes' });
				} else returnCodes.add(normalized);
			}
		}
	},
});
