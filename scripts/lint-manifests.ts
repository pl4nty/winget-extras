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
 *   bun scripts/lint-manifests.ts          # check, exit 1 on issues
 *   bun scripts/lint-manifests.ts --fix    # rewrite files in place
 *
 * In GitHub Actions (GITHUB_ACTIONS=true) issues are emitted as `::error`
 * workflow commands so they surface as inline annotations on the PR.
 */
import { Glob } from 'bun';
import { readFileSync, writeFileSync } from 'node:fs';

const FIX = process.argv.includes('--fix');
const CI = process.env.GITHUB_ACTIONS === 'true';

const HEADER_RE = /^#yaml-language-server:/m;

interface Issue {
	file: string;
	line: number;
	message: string;
}

function report(issue: Issue): void {
	if (CI) {
		console.log(`::error file=${issue.file},line=${issue.line}::${issue.message}`);
	} else {
		console.log(`${issue.file}:${issue.line} - ${issue.message}`);
	}
}

const issues: Issue[] = [];
let fixed = 0;

for (const file of new Glob('manifests/**/*.yaml').scanSync('.')) {
	const buf = readFileSync(file);

	// Detect a leading BOM from raw bytes: a utf-8 TextDecoder silently
	// strips it, so decoding first would hide the problem.
	const hasBom = buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
	let text = (hasBom ? buf.subarray(3) : buf).toString('utf8');
	let changed = false;

	if (hasBom) {
		issues.push({ file, line: 1, message: 'File starts with a UTF-8 BOM; remove it.' });
		changed = true;
	}

	if (HEADER_RE.test(text)) {
		const line = text.slice(0, text.search(HEADER_RE)).split('\n').length;
		issues.push({
			file,
			line,
			message: "Missing space after '#' in the yaml-language-server header; use '# yaml-language-server:'.",
		});
		text = text.replace(HEADER_RE, '# yaml-language-server:');
		changed = true;
	}

	if (changed && FIX) {
		writeFileSync(file, Buffer.from(text, 'utf8'));
		fixed++;
	}
}

if (FIX) {
	console.log(`Fixed ${fixed} manifest file(s).`);
	process.exit(0);
}

for (const issue of issues) report(issue);

if (issues.length > 0) {
	console.error(`\n${issues.length} manifest issue(s) found. Run \`bun manifests:fix\` to fix them.`);
	process.exit(1);
}

console.log('Manifests OK: no BOM or header issues found.');
