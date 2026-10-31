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
	const lines = (await $`7z l ${exe}`.text()).split('\n');
	const wanted =
		/cmtrace|clispy|policyspy|cmpivot|supportcenter|uploadofflinefeedback|sendschedule|powervwr|deploymentmonitoring|clienttools/i;
	console.log(
		lines
			.filter(
				(line) =>
					!/LanguagePack/i.test(line) &&
					(wanted.test(line) || /smssetup\/tools\/[^/]+$/i.test(line)),
			)
			.join('\n'),
	);
	const cmtrace = lines.map((line) => line.slice(53)).find((path) => /\/CMTrace\.exe$/i.test(path));
	if (cmtrace) {
		await $`7z x ${exe} -o${join(dir, 'out')} ${cmtrace}`.quiet();
		const pe = await $`7z l -slt ${join(dir, 'out', cmtrace)}`.nothrow().text();
		console.log(
			pe
				.split('\n')
				.filter((line) => /version|path = \.rsrc\/.*version/i.test(line))
				.join('\n'),
		);
		const info = await $`7z e -so ${join(dir, 'out', cmtrace)} .rsrc/version.txt`.nothrow().text();
		console.log(info.slice(0, 1500));
	}
	throw new Error('debug listing only');
});
