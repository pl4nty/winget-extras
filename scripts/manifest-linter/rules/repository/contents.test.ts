import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';

import { repositoryContentsRule } from '@/scripts/manifest-linter/rules/repository/contents';
import {
	VERSION,
	checkRule,
	entry,
	messages,
	record,
} from '@/scripts/manifest-linter/rules/test-utils';

describe('repository contents rule', () => {
	test('rejects nested and non-manifest files in manifest directories', async () => {
		const directory = join('manifests', 'a', 'Acme', 'App', VERSION);
		const issues = await checkRule(repositoryContentsRule, {
			records: [record('installer')],
			entries: [entry(directory, 'nested', 'directory'), entry(directory, 'notes.txt', 'file')],
		});
		expect(messages(issues)).toContain('subdirectories are not allowed in a manifest directory');
		expect(messages(issues)).toContain('manifest directories may contain only regular .yaml files');
	});

	test('allows non-manifest files only at package level', async () => {
		const versionDirectory = join('manifests', 'a', 'Acme', 'App', VERSION);
		const packageDirectory = join('manifests', 'a', 'Acme', 'App');
		const issues = await checkRule(repositoryContentsRule, {
			records: [record('version')],
			entries: [
				entry(packageDirectory, 'metadata.xml', 'file'),
				entry(join('manifests', 'a', 'Acme'), 'publisher.txt', 'file'),
				entry(versionDirectory, 'version.txt', 'file'),
				entry(join(packageDirectory, 'assets'), 'nested.xml', 'file'),
			],
		});
		expect(issues.some((issue) => issue.file === join(packageDirectory, 'metadata.xml'))).toBe(
			false,
		);
		expect(
			issues.filter(
				(issue) => issue.message === 'non-manifest files are allowed only at package level',
			),
		).toHaveLength(2);
		expect(messages(issues)).toContain('manifest directories may contain only regular .yaml files');
	});

	test('rejects directories that do not belong to a package path', async () => {
		const packageDirectory = join('manifests', 'a', 'Acme', 'App');
		const strayPackageDirectory = join('manifests', 'ai', 'AIMP', 'AIMP');
		const issues = await checkRule(repositoryContentsRule, {
			records: [record('version')],
			entries: [
				entry(join('manifests', 'a'), 'Acme', 'directory'),
				entry(join('manifests', 'a', 'Acme'), 'App', 'directory'),
				entry(packageDirectory, VERSION, 'directory'),
				entry('manifests', 'ai', 'directory'),
				entry(join('manifests', 'ai'), 'AIMP', 'directory'),
				entry(join('manifests', 'ai', 'AIMP'), 'AIMP', 'directory'),
				entry(strayPackageDirectory, 'notes.txt', 'file'),
				entry('manifests', 'empty', 'directory'),
			],
		});
		expect(
			issues.filter((issue) => issue.message === 'directory does not belong to a package'),
		).toHaveLength(3);
		expect(issues.some((issue) => issue.file === join('manifests', 'empty'))).toBe(false);
	});
});
