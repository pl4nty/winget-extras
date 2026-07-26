import { describe, expect, test } from 'bun:test';

import { urlPinningRule } from '@/scripts/manifest-linter/rules/installer/url-pinning';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer URL pinning rule', () => {
	test('rejects refs that are not tags or commits', async () => {
		const issues = await checkInstallerRule(urlPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/acme/app/raw/refs/heads/master/dist/app.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/refs/heads/main.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/blob/release/app.zip?raw=true' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/acme/app/1.1.333/app.ttf' },
				{ InstallerUrl: 'https://codeload.github.com/acme/app/zip/refs/heads/main' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use a pinned tag or commit (found refs/heads/master)',
			'InstallerUrl must use a pinned tag or commit (found refs/heads/main)',
			'InstallerUrl must use a pinned tag or commit (found release)',
			'InstallerUrl must use a pinned tag or commit (found 1.1.333)',
			'InstallerUrl must use a pinned tag or commit (found refs/heads/main)',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('accepts tags, commits, releases, and other hosts', async () => {
		const issues = await checkInstallerRule(urlPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/acme/app/raw/refs/tags/v1.0/app.ttf' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/refs/tags/v1.0.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/329858c2c4dbd347.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/releases/download/main/app.exe' },
				{ InstallerUrl: 'https://example.test/master/app.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});
});
