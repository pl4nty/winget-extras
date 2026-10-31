import { defineShard } from 'anthelion';

import { readClickOnce } from '@/scripts/shards-lib/clickonce';
import { mirrorFile } from '@/scripts/shards-lib/mirror';

export default defineShard(async () => {
	const { version, zip } = await readClickOnce(
		'https://explorer.kusto.io/app/Kusto.Explorer.application',
	);

	return {
		version,
		urls: async () => [
			await mirrorFile('Microsoft.Kusto.Explorer', version, 'Kusto.Explorer.exe.zip', zip),
		],
	};
});
