import { defineShard } from 'anthelion';
import { komac } from 'anthelion/helpers';
import ky from 'ky';

import { driverHeaders } from '@/scripts/shards-lib/AMD';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

const url = 'https://drivers.amd.com/drivers/software/amdbugreporttool.exe';

export default defineShard(async () => {
	const response = await ky(url, { headers: driverHeaders, timeout: 300_000, retry: 3 });
	const state = response.headers.get('etag');
	if (!state) {
		throw new Error('No ETag header found');
	}
	const file = await response.bytes();

	// komac can't send the Referer drivers.amd.com needs, so serve it the downloaded file
	const server = Bun.serve({ port: 0, fetch: () => new Response(file) });
	const { versions } = await komac
		.analyzeInstaller(`http://localhost:${server.port}/amdbugreporttool.exe`)
		.finally(() => server.stop());
	if (!versions.product) {
		throw new Error('No ProductVersion found');
	}
	const version = versions.product;

	return {
		version,
		urls: async () => [
			{
				url: await mirrorFile(
					'AMD.BugReportTool',
					version,
					'amdbugreporttool.exe',
					async () => file,
				),
				architecture: 'x64',
			},
		],
		state,
	};
});
