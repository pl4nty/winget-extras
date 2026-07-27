import ky from 'ky';

import { readZipEntry } from '@/scripts/zip';

// The analyzer ships as a zip whose only version marker is a date string in the
// PowerShell entry point ($ScriptVer = "28May2026"); the bundled
// Tools/MDEClientAnalyzer.exe reports an unrelated connector build. Lives
// outside shards/ because the Test workflow treats every changed file under
// shards/** as a package.

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** Turns the analyzer's `28May2026` into the manifest's `2026.5.28`. */
export function analyzerVersion(script: string): string {
	const stamp = /\$ScriptVer\s*=\s*"(\d{1,2})([A-Za-z]{3})(\d{4})"/.exec(script);
	if (!stamp) throw new Error('No $ScriptVer found in MDEClientAnalyzer.ps1');
	const [, day, month, year] = stamp as unknown as [string, string, string, string];
	const index = MONTHS.indexOf(month.toLowerCase());
	if (index === -1) throw new Error(`Unrecognised month in $ScriptVer: ${month}`);
	return `${year}.${index + 1}.${Number(day)}`;
}

export async function analyzerShard(shortLink: string) {
	const response = await ky(shortLink);
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) throw new Error(`No entity tag or last-modified for ${shortLink}`);
	const archive = new Uint8Array(await response.arrayBuffer());
	const script = new TextDecoder().decode(
		readZipEntry(archive, (name) => name === 'MDEClientAnalyzer.ps1'),
	);

	// Record where the aka.ms shortlink lands rather than the shortlink itself.
	// The analyzer is a script package, so one architecture covers it.
	return {
		version: analyzerVersion(script),
		urls: () => [{ url: response.url, architecture: 'x64' }],
		state,
		replace: true,
	};
}
