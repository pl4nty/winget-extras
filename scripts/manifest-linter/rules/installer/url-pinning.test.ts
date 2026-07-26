import { describe, expect, test } from 'bun:test';

import { urlPinningRule } from '@/scripts/manifest-linter/rules/installer/url-pinning';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer URL pinning rule', () => {
	test('rejects refs that are not tags or commits', async () => {
		const issues = await checkInstallerRule(urlPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/andreberg/Meslo-Font/raw/refs/heads/master/Meslo.zip' },
				{ InstallerUrl: 'https://github.com/googlefonts/tinos/archive/refs/heads/main.zip' },
				{ InstallerUrl: 'https://github.com/larsenwork/monoid/blob/release/Monoid.zip?raw=true' },
				{ InstallerUrl: 'https://github.com/microsoft/fluentui/raw/1.1.333/Icons.ttf' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/microsoft/app-metadata/HEAD/app.appx' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use a pinned tag or commit (found refs/heads/master)',
			'InstallerUrl must use a pinned tag or commit (found refs/heads/main)',
			'InstallerUrl must use a pinned tag or commit (found release)',
			'InstallerUrl must use a pinned tag or commit (found 1.1.333)',
			'InstallerUrl must use a pinned tag or commit (found HEAD)',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('accepts tags, commits, releases, and other hosts', async () => {
		const issues = await checkInstallerRule(urlPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/powerline/powerline/raw/refs/tags/2.8.4/Symbols.otf' },
				{ InstallerUrl: 'https://github.com/blobject/agave/archive/refs/tags/v37.zip' },
				{ InstallerUrl: 'https://github.com/googlefonts/spacemono/archive/329858c2c4dbd347.zip' },
				{ InstallerUrl: 'https://codeload.github.com/twixes/sf-mono/zip/refs/tags/v16.0d1e1' },
				{ InstallerUrl: 'https://github.com/owner/repo/releases/download/main/setup.exe' },
				{ InstallerUrl: 'https://example.test/master/setup.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});

	test('reports one InstallerUrl shared by installers once', async () => {
		const InstallerUrl = 'https://github.com/owner/repo/raw/refs/heads/main/font.ttf';
		const issues = await checkInstallerRule(urlPinningRule, {
			Installers: [{ InstallerUrl }, { InstallerUrl }],
		});
		expect(issues).toHaveLength(1);
	});
});
