import { describe, expect, test } from 'bun:test';

import { urlPinningRule } from '@/scripts/manifest-linter/rules/installer/url-pinning';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

function installers(...urls: string[]): Record<string, any> {
	return {
		InstallerType: 'zip',
		NestedInstallerType: 'font',
		NestedInstallerFiles: [{ RelativeFilePath: 'font.ttf' }],
		Installers: urls.map((InstallerUrl, index) => ({
			Architecture: index === 0 ? 'x64' : 'arm64',
			InstallerUrl,
			InstallerSha256: 'A'.repeat(64),
		})),
	};
}

describe('installer URL pinning rule', () => {
	test('flags downloads served from a branch', async () => {
		const issues = await checkInstallerRule(
			urlPinningRule,
			installers(
				'https://github.com/andreberg/Meslo-Font/raw/refs/heads/master/dist/v1.2.1/Meslo%20LG%20v1.2.1.zip',
				'https://raw.githubusercontent.com/microsoft/app-metadata/refs/heads/master/test/assets/app.appx',
				'https://github.com/googlefonts/tinos/archive/refs/heads/main.zip',
			),
		);
		expect(messages(issues)).toEqual([
			'InstallerUrl downloads from branch master instead of a pinned tag or commit',
			'InstallerUrl downloads from branch master instead of a pinned tag or commit',
			'InstallerUrl downloads from branch main instead of a pinned tag or commit',
		]);
		expect(issues[0]?.level).toBe('warning');
		expect(issues[0]?.search).toContain('Meslo%20LG%20v1.2.1.zip');
	});

	test('flags any ref that is not demonstrably a tag or commit', async () => {
		const issues = await checkInstallerRule(
			urlPinningRule,
			installers(
				'https://github.com/larsenwork/monoid/blob/release/Monoid.zip?raw=true',
				'https://raw.githubusercontent.com/example/example/HEAD/font.ttf',
				'https://raw.githubusercontent.com/microsoft/fluentui-system-icons/1.1.333/fonts/Icons.ttf',
			),
		);
		expect(messages(issues)).toEqual([
			'InstallerUrl downloads from ref release, which is not a pinned tag or commit',
			'InstallerUrl downloads from ref HEAD, which is not a pinned tag or commit',
			'InstallerUrl downloads from ref 1.1.333, which is not a pinned tag or commit',
		]);
	});

	test('flags every codeload.github.com download, pinned or not', async () => {
		const issues = await checkInstallerRule(
			urlPinningRule,
			installers(
				'https://codeload.github.com/andrew-paglinawan/QuicksandFamily/zip/be4b9d638e1c79fa42d4a0ab0aa7fe29466419c7',
				'https://codeload.github.com/googlefonts/tinos/tar.gz/refs/tags/v1.231',
			),
		);
		expect(messages(issues)).toEqual([
			'InstallerUrl downloads from codeload.github.com instead of github.com',
			'InstallerUrl downloads from codeload.github.com instead of github.com',
		]);
		expect(issues[0]?.hints?.at(0)).toContain('https://github.com/<owner>/<repo>/archive/<ref>');
	});

	test('accepts tags, commits, releases, and other hosts', async () => {
		const issues = await checkInstallerRule(
			urlPinningRule,
			installers(
				'https://github.com/powerline/powerline/raw/refs/tags/2.8.4/font/PowerlineSymbols.otf',
				'https://github.com/blobject/agave/archive/refs/tags/v37.zip',
				'https://raw.githubusercontent.com/googlefonts/noto-emoji/refs/tags/v2.051/fonts/NotoColorEmoji.ttf',
				'https://github.com/googlefonts/spacemono/archive/329858c2c4dbd3476f972a4ae00624b018cf4b81.zip',
				'https://raw.githubusercontent.com/rubjo/victor-mono/53472c5c196bdd9d0bf005ed7b3b935a2c43bec6/VictorMonoAll.zip',
				'https://github.com/owner/repo/releases/download/main/setup.exe',
				'https://example.test/master/setup.exe',
				'not a url',
			),
		);
		expect(issues).toEqual([]);
	});

	test('reports a shared URL once', async () => {
		const url = 'https://github.com/owner/repo/raw/refs/heads/main/font.ttf';
		const issues = await checkInstallerRule(urlPinningRule, installers(url, url));
		expect(issues).toHaveLength(1);
	});
});
