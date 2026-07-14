// Check (or --fix) winget manifests for a UTF-8 BOM (#342) and a missing space
// in the `# yaml-language-server:` header (#344); oxfmt/oxlint skip manifests/**.
import { globSync, readFileSync, writeFileSync } from 'node:fs';

const fix = process.argv.includes('--fix');
let dirty = 0;

for (const file of globSync('manifests/**/*.yaml')) {
	const raw = readFileSync(file, 'utf8'); // keeps any BOM as a leading \uFEFF
	const clean = raw
		.replace(/^\uFEFF/, '')
		.replace(/^#yaml-language-server:/m, '# yaml-language-server:');
	if (clean === raw) continue;
	dirty++;
	if (fix) writeFileSync(file, clean);
	else {
		const message = 'BOM or unspaced yaml-language-server header';
		console.log(
			process.env.GITHUB_ACTIONS
				? `::error file=${file},line=1::${message}`
				: `${file}: ${message}`,
		);
	}
}

console.log(
	fix ? `Fixed ${dirty} file(s).` : dirty ? `Run \`bun manifests:fix\` to fix.` : 'Manifests OK.',
);
if (!fix && dirty) process.exit(1);
