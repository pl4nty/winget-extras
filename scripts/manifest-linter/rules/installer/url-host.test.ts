import { describe, expect, test } from 'bun:test';

import { urlHostRule } from '@/scripts/manifest-linter/rules/installer/url-host';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer URL host rule', () => {
	test('rejects the hosts github.com redirects to', async () => {
		const issues = await checkInstallerRule(urlHostRule, {
			Installers: [
				{ InstallerUrl: 'https://raw.githubusercontent.com/googlefonts/noto/refs/tags/v2/e.ttf' },
				{ InstallerUrl: 'https://codeload.github.com/twixes/sf-mono/zip/refs/tags/v16.0d1e1' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use github.com, not raw.githubusercontent.com',
			'InstallerUrl must use github.com, not codeload.github.com',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('accepts github.com and unrelated hosts', async () => {
		const issues = await checkInstallerRule(urlHostRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/owner/repo/releases/download/v1/setup.exe' },
				{ InstallerUrl: 'https://example.test/setup.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});

	test('reports one InstallerUrl shared by installers once', async () => {
		const InstallerUrl = 'https://raw.githubusercontent.com/owner/repo/refs/tags/v1/font.ttf';
		const issues = await checkInstallerRule(urlHostRule, {
			Installers: [{ InstallerUrl }, { InstallerUrl }],
		});
		expect(issues).toHaveLength(1);
	});
});
