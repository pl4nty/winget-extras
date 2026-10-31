import { defineShard } from 'anthelion';
import ky from 'ky';

import { driverHeaders, mirrorDriver } from '@/scripts/shards-lib/AMD';

const url = 'https://drivers.amd.com/drivers/software/amdbugreporttool.exe';

export default defineShard(async () => {
	const { headers } = await ky.head(url, { headers: driverHeaders });
	const state = headers.get('etag');
	const lastModified = headers.get('last-modified');
	if (!state || !lastModified) {
		throw new Error('No ETag or Last-Modified header found');
	}

	return {
		version: { source: 'product' },
		urls: async () => [
			{
				url: await mirrorDriver(
					'AMD.BugReportTool',
					new Date(lastModified).toISOString().slice(0, 10),
					url,
				),
				architecture: 'x64',
			},
		],
		state,
	};
});
