import { describe, expect, test } from 'bun:test';

import { archiveRule } from '@/scripts/manifest-linter/rules/installer/archive';
import { checkInstallerRule, messages } from '@/scripts/manifest-linter/rules/test-utils';

describe('installer archive rule', () => {
	test('validates portable installer limits', async () => {
		const issues = await checkInstallerRule(archiveRule, {
			InstallerType: 'portable',
			Commands: ['one', 'two'],
			Scope: 'user',
			AppsAndFeaturesEntries: [{ DisplayName: 'One' }, { DisplayName: 'Two' }],
		});
		expect(messages(issues)).toContain('a portable installer may define at most one command');
		expect(messages(issues)).toContain(
			'a portable installer may define at most one AppsAndFeaturesEntries item',
		);
		expect(issues.find((issue) => issue.message.startsWith('Scope'))?.level).toBe('warning');
	});

	test('requires zip metadata and limits non-portable nested files', async () => {
		expect(messages(await checkInstallerRule(archiveRule, { InstallerType: 'zip' }))).toEqual([
			'a zip installer requires NestedInstallerType',
			'a zip installer requires NestedInstallerFiles',
		]);
		const issues = await checkInstallerRule(archiveRule, {
			InstallerType: 'zip',
			NestedInstallerType: 'exe',
			NestedInstallerFiles: [{ RelativeFilePath: 'one.exe' }, { RelativeFilePath: 'two.exe' }],
		});
		expect(messages(issues)).toContain(
			'a non-portable, non-font zip installer may contain only one nested installer',
		);
	});

	test('validates paths, aliases, and font extensions', async () => {
		const issues = await checkInstallerRule(archiveRule, {
			InstallerType: 'zip',
			NestedInstallerType: 'font',
			NestedInstallerFiles: [
				{ RelativeFilePath: '../Example.woff2', PortableCommandAlias: '../example' },
				{ RelativeFilePath: '../EXAMPLE.WOFF2', PortableCommandAlias: '../EXAMPLE' },
			],
		});
		expect(messages(issues)).toEqual([
			'RelativeFilePath may not escape the archive directory',
			'PortableCommandAlias may not escape the base directory',
			'nested font file type .woff2 is not supported',
			'RelativeFilePath may not escape the archive directory',
			'duplicate RelativeFilePath',
			'PortableCommandAlias may not escape the base directory',
			'duplicate PortableCommandAlias',
			'nested font file type .woff2 is not supported',
		]);
	});

	test('allows one nested file path to expose different aliases', async () => {
		const issues = await checkInstallerRule(archiveRule, {
			InstallerType: 'zip',
			NestedInstallerType: 'portable',
			NestedInstallerFiles: [
				{ RelativeFilePath: 'tool.exe', PortableCommandAlias: 'tool-one' },
				{ RelativeFilePath: 'TOOL.EXE', PortableCommandAlias: 'tool-two' },
			],
		});
		expect(issues).toEqual([]);
	});
});
