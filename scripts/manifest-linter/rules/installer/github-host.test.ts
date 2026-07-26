import { describe, expect, test } from 'bun:test';

import { githubHostRule } from '@/scripts/manifest-linter/rules/installer/github-host';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('GitHub host rule', () => {
	test('rejects the hosts github.com redirects to', async () => {
		const issues = await checkInstallerRule(githubHostRule, {
			Installers: [
				{ InstallerUrl: 'https://raw.githubusercontent.com/acme/app/refs/tags/v1.0/app.ttf' },
				{ InstallerUrl: 'https://codeload.github.com/acme/app/zip/refs/tags/v1.0' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use github.com, not raw.githubusercontent.com',
			'InstallerUrl must use github.com, not codeload.github.com',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('accepts github.com and other hosts', async () => {
		const issues = await checkInstallerRule(githubHostRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/acme/app/releases/download/v1.0/app.exe' },
				{ InstallerUrl: 'https://example.test/app.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});
});
