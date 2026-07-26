import { defineConfig } from 'oxfmt';

export default defineConfig({
	useTabs: true,
	singleQuote: true,
	sortImports: {},
	ignorePatterns: [
		'scripts/manifest-linter/generated/**',
		'manifests/**',
		'fonts/**',
		'index/**',
		'archive/**',
		'.github/workflows/analyses.json',
	],
});
