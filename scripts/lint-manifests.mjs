#!/usr/bin/env bun
/**
 * Lint winget manifests for encoding/header issues that oxfmt/oxlint ignore.
 *
 * `manifests/**` is excluded from oxfmt (see oxfmt.config.ts), so these files
 * are otherwise unchecked. This guards the two problems seen in the wild:
 *
 *   - a leading UTF-8 BOM (EF BB BF)      -> strip it        (PR #342)
 *   - `#yaml-language-server:` no space   -> `# yaml-...`    (PR #344)
 *
 * Usage:
 *   bun scripts/lint-manifests.mjs          # check, exit 1 on issues
 *   bun scripts/lint-manifests.mjs --fix    # rewrite files in place
 */
import { globSync, readFileSync, writeFileSync } from 'node:fs';

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const UNSPACED_HEADER = /^#yaml-language-server:/m;

/**
 * Inspect one manifest's raw bytes. Returns the list of issues found and the
 * corrected text. Pure: no I/O, so it can be unit tested directly.
 *
 * @param {Buffer} buf raw file contents
 * @returns {{ issues: { line: number, message: string }[], fixed: string }}
 */
export function analyze(buf) {
	const issues = [];

	// Detect the BOM from raw bytes: a utf-8 decoder silently strips it, so
	// decoding first would hide the problem.
	const hasBom = buf.subarray(0, UTF8_BOM.length).equals(UTF8_BOM);
	let text = (hasBom ? buf.subarray(UTF8_BOM.length) : buf).toString('utf8');

	if (hasBom) {
		issues.push({ line: 1, message: 'File starts with a UTF-8 BOM; remove it.' });
	}

	const match = text.match(UNSPACED_HEADER);
	if (match) {
		issues.push({
			line: text.slice(0, match.index).split('\n').length,
			message:
				"Missing space after '#' in the yaml-language-server header; use '# yaml-language-server:'.",
		});
		text = text.replace(UNSPACED_HEADER, '# yaml-language-server:');
	}

	return { issues, fixed: text };
}

function main() {
	const fix = process.argv.includes('--fix');
	const ci = process.env.GITHUB_ACTIONS === 'true';
	let issueCount = 0;
	let fixedCount = 0;

	for (const file of globSync('manifests/**/*.yaml')) {
		const { issues, fixed } = analyze(readFileSync(file));
		if (issues.length === 0) continue;
		issueCount += issues.length;

		if (fix) {
			writeFileSync(file, fixed);
			fixedCount++;
			continue;
		}

		for (const { line, message } of issues) {
			// In Actions, `::error` workflow commands render as inline PR annotations.
			console.log(
				ci ? `::error file=${file},line=${line}::${message}` : `${file}:${line} - ${message}`,
			);
		}
	}

	if (fix) {
		console.log(`Fixed ${fixedCount} manifest file(s).`);
		return;
	}

	if (issueCount > 0) {
		console.error(
			`\n${issueCount} manifest issue(s) found. Run \`bun manifests:fix\` to fix them.`,
		);
		process.exit(1);
	}

	console.log('Manifests OK: no BOM or header issues found.');
}

if (import.meta.main) main();
