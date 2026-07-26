import { dirname, join } from 'node:path';

import { defineRule } from '@/scripts/manifest-linter/rules/helpers';

export const repositoryContentsRule = defineRule({
	id: 'repository/contents',
	check({ entries, records, report }) {
		const packageDirectories = new Set<string>();
		const manifestDirectories = new Set<string>();
		const allowedDirectories = new Set<string>();
		const directoriesWithFiles = new Set<string>();

		for (const { entry } of entries) {
			if (entry.isDirectory()) continue;
			for (
				let directory = entry.parentPath;
				directory !== '.' && directory !== dirname(directory);
				directory = dirname(directory)
			) {
				directoriesWithFiles.add(directory);
			}
		}

		for (const { root, directory, manifest } of records) {
			manifestDirectories.add(directory);
			const expectedDirectory = join(
				root,
				manifest.PackageIdentifier.slice(0, 1).toLowerCase(),
				...manifest.PackageIdentifier.split('.'),
				manifest.PackageVersion,
			);
			packageDirectories.add(dirname(expectedDirectory));
			for (
				let allowedDirectory = expectedDirectory;
				allowedDirectory !== root;
				allowedDirectory = dirname(allowedDirectory)
			) {
				allowedDirectories.add(allowedDirectory);
			}
		}

		for (const { entry } of entries) {
			const path = join(entry.parentPath, entry.name);
			if (manifestDirectories.has(entry.parentPath)) {
				if (entry.isDirectory()) {
					report({ file: path, message: 'subdirectories are not allowed in a manifest directory' });
				} else if (!entry.isFile() || !entry.name.endsWith('.yaml')) {
					report({
						file: path,
						message: 'manifest directories may contain only regular .yaml files',
					});
				}
			} else if (entry.isDirectory()) {
				if (!allowedDirectories.has(path) && directoriesWithFiles.has(path)) {
					report({ file: path, message: 'directory does not belong to a package' });
				}
			} else if (
				!entry.name.endsWith('.yaml') &&
				(!entry.isFile() || !packageDirectories.has(entry.parentPath))
			) {
				report({ file: path, message: 'non-manifest files are allowed only at package level' });
			}
		}
	},
});
