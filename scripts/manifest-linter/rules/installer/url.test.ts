import { describe, expect, test } from 'bun:test';

import { installerUrlRule } from '@/scripts/manifest-linter/rules/installer/url';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer URL rule', () => {
	test('rejects refs that are not tags or commits', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/andreberg/Meslo-Font/raw/refs/heads/master/Meslo.zip' },
				{ InstallerUrl: 'https://github.com/googlefonts/tinos/archive/refs/heads/main.zip' },
				{ InstallerUrl: 'https://github.com/larsenwork/monoid/blob/release/Monoid.zip?raw=true' },
				{ InstallerUrl: 'https://github.com/microsoft/fluentui/raw/1.1.333/Icons.ttf' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use a pinned tag or commit (found refs/heads/master)',
			'InstallerUrl must use a pinned tag or commit (found refs/heads/main)',
			'InstallerUrl must use a pinned tag or commit (found release)',
			'InstallerUrl must use a pinned tag or commit (found 1.1.333)',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('rejects hosts that github.com redirects to', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{
					InstallerUrl: 'https://raw.githubusercontent.com/googlefonts/noto/refs/tags/v2.051/e.ttf',
				},
				{ InstallerUrl: 'https://codeload.github.com/twixes/sf-mono/zip/refs/tags/v16.0d1e1' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/microsoft/app-metadata/HEAD/app.appx' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use github.com, not raw.githubusercontent.com',
			'InstallerUrl must use github.com, not codeload.github.com',
			'InstallerUrl must use github.com, not raw.githubusercontent.com',
			'InstallerUrl must use a pinned tag or commit (found HEAD)',
		]);
	});

	test('accepts pinned github.com downloads and other hosts', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/powerline/powerline/raw/refs/tags/2.8.4/Symbols.otf' },
				{ InstallerUrl: 'https://github.com/blobject/agave/archive/refs/tags/v37.zip' },
				{ InstallerUrl: 'https://github.com/googlefonts/spacemono/archive/329858c2c4dbd347.zip' },
				{ InstallerUrl: 'https://github.com/owner/repo/releases/download/main/setup.exe' },
				{ InstallerUrl: 'https://example.test/master/setup.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});

	test('reports one InstallerUrl shared by installers once', async () => {
		const InstallerUrl = 'https://github.com/owner/repo/raw/refs/heads/main/font.ttf';
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [{ InstallerUrl }, { InstallerUrl }],
		});
		expect(issues).toHaveLength(1);
	});
});
