// TEMPORARY: lists the ConfigMgr evaluation media in Test so the extraction paths can be chosen
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineShard } from 'anthelion';
import { $ } from 'bun';
import ky from 'ky';

export default defineShard(async () => {
	const dir = await mkdtemp(join(tmpdir(), 'configmgr-'));
	const exe = join(dir, 'media.exe');
	await Bun.write(
		exe,
		await ky('https://go.microsoft.com/fwlink/?linkid=2350307', { timeout: 600_000 }),
	);
	console.log(await $`7z | head -3`.nothrow().text(), await $`ls -la ${dir}`.text());
	for (const args of [[], ['-t7z'], ['-tPE']]) {
		const r = await $`7z l ${args} ${exe}`.nothrow().quiet();
		const lines = (r.stdout.toString() + r.stderr.toString()).split('\n');
		console.log(args, r.exitCode, lines.length);
		console.log(
			lines
				.filter((line) => /error|tools|\.msi|cmtrace|clispy/i.test(line))
				.slice(0, 80)
				.join('\n'),
		);
	}
	throw new Error('debug listing only');
});
