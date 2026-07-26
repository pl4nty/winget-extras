import { describe, expect, test } from 'bun:test';

import { githubPinningRule } from '@/scripts/manifest-linter/rules/installer/github-pinning';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('GitHub pinning rule', () => {
	test('rejects refs that are not tags or commits', async () => {
		const issues = await checkInstallerRule(githubPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/acme/app/raw/refs/heads/master/dist/app.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/refs/heads/main.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/blob/release/app.zip?raw=true' },
				{ InstallerUrl: 'https://github.com/acme/app/raw/1.1.333/app.ttf' },
			],
		});
		expect(messages(issues)).toEqual([
			'InstallerUrl must use a pinned tag or commit',
			'InstallerUrl must use a pinned tag or commit',
			'InstallerUrl must use a pinned tag or commit',
			'InstallerUrl must use a pinned tag or commit',
		]);
		expect(issues.at(0)?.level).toBe('warning');
	});

	test('accepts tags, commits, releases, and other hosts', async () => {
		const issues = await checkInstallerRule(githubPinningRule, {
			Installers: [
				{ InstallerUrl: 'https://github.com/acme/app/raw/refs/tags/v1.0/app.ttf' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/refs/tags/v1.0.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/archive/329858c2c4dbd347.zip' },
				{ InstallerUrl: 'https://github.com/acme/app/raw/53472c5c196bdd9d/app.ttf' },
				{ InstallerUrl: 'https://github.com/acme/app/releases/download/main/app.exe' },
				{ InstallerUrl: 'https://raw.githubusercontent.com/acme/app/refs/heads/main/app.ttf' },
				{ InstallerUrl: 'https://example.test/master/app.exe' },
				{ InstallerUrl: 'not a url' },
			],
		});
		expect(issues).toEqual([]);
	});
});
