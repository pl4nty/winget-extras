import { describe, expect, test } from 'bun:test';

import { installerUrlRule } from '@/scripts/manifest-linter/rules/installer/url';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer URL rule', () => {
	test('rejects refs that are not tags or commits', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/andreberg/Meslo-Font/raw/refs/heads/master/Meslo.zip' },
				{ InstallerUrl: 'https://github.com/googlefonts/tinos/archive/refs/heads/main.zip' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/microsoft/app-metadata/HEAD/app.appx' },
				{ InstallerUrl: 'https://github.com/larsenwork/monoid/blob/release/Monoid.zip?raw=true' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/microsoft/fluentui/1.1.333/Icons.ttf' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use a pinned tag or commit (found refs/heads/master)',
			'InstallerUrl must use a pinned tag or commit (found refs/heads/main)',
			'InstallerUrl must use a pinned tag or commit (found HEAD)',
			'InstallerUrl must use a pinned tag or commit (found release)',
			'InstallerUrl must use a pinned tag or commit (found 1.1.333)',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('rejects codeload.github.com downloads, pinned or not', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{
					InstallerUrl:
						'https://codeload.github.com/andrew-paglinawan/QuicksandFamily/zip/be4b9d638e1c79fa42d4a0ab0aa7fe29466419c7',
				},
			],
		});
		expect(messages(issues)).toEqual(['InstallerUrl must not use codeload.github.com']);
	});

	test('accepts tags, commits, releases, and other hosts', async () => {
		const issues = await checkInstallerRule(installerUrlRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/powerline/powerline/raw/refs/tags/2.8.4/Symbols.otf' },
				{ InstallerUrl: 'https://github.com/blobject/agave/archive/refs/tags/v37.zip' },
				{
					InstallerUrl: 'https://raw.githubusercontent.com/googlefonts/noto/refs/tags/v2.051/e.ttf',
				},
				{ InstallerUrl: 'https://github.com/googlefonts/spacemono/archive/329858c2c4dbd347.zip' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/rubjo/victor-mono/53472c5c1/All.zip' },
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
