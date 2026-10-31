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
	const listing = await $`7z l ${exe}`.text();
	console.log(
		listing
			.split('\n')
			.filter((line) => /tools|\.msi|\.exe$/i.test(line) && !/\\(x64|i386)\\[^\\]*\.dll/i.test(line))
			.join('\n'),
	);
	await $`7z e ${exe} -o${join(dir, 'out')} -r CMTrace.exe CliSpy.exe PolicySpy.exe`.quiet();
	for (const name of ['CMTrace.exe', 'CliSpy.exe', 'PolicySpy.exe']) {
		const out = await $`7z e ${join(dir, 'out', name)} -so .rsrc/version.txt`.nothrow().text();
		console.log(name, out.match(/(File|Product)Version[^\n]*/g));
	}
	throw new Error('debug listing only');
});
