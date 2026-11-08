import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import { $ } from 'bun';
import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

type Details = {
	dlcDetailsView: { downloadFile: { name: string; url: string; version: string }[] };
};

// MSKLC.exe is a plain 7-Zip SFX that only extracts MSKLC.msi, so mirror the MSI
export default defineShard(async () => {
	const page = await ky('https://www.microsoft.com/en-us/download/details.aspx?id=102134').text();
	const { groups } = match(page, /<script>window\.__DLCDetails__=(\{.+?\})<\/script>/is);
	const file = (JSON.parse(groups[0]) as Details).dlcDetailsView.downloadFile.find(
		({ name }) => name === 'MSKLC.exe',
	);
	if (!file) throw new Error('No MSKLC.exe on the Download Center page');

	return {
		version: file.version,
		urls: async () => [
			await mirrorFile('Microsoft.KeyboardLayoutCreator', file.version, 'MSKLC.msi', async () => {
				const dir = await mkdtemp(join(tmpdir(), 'msklc-'));
				const exe = join(dir, 'MSKLC.exe');
				await Bun.write(exe, await ky(file.url, { timeout: 300_000, retry: 3 }));
				return new Uint8Array(await $`7z e -so ${exe} MSKLC/MSKLC.msi`.arrayBuffer());
			}),
		],
	};
});
