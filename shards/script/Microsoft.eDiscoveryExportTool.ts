import { defineShard } from 'anthelion';

import { readClickOnce } from '@/scripts/shards-lib/clickonce';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

export default defineShard(async () => {
	const { version, zip } = await readClickOnce(
		'https://complianceclientsdf.blob.core.windows.net/v16/Microsoft.Office.Client.Discovery.UnifiedExportTool.application',
	);

	return {
		version,
		urls: async () => [
			await mirrorFile(
				'Microsoft.eDiscoveryExportTool',
				version,
				'Microsoft.Office.Client.Discovery.UnifiedExportTool.zip',
				zip,
			),
		],
	};
});
