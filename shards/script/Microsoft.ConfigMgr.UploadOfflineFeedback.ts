import { defineShard } from 'anthelion';

import { buildVersionedTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	buildVersionedTool('UploadOfflineFeedback', 'UploadOfflineFeedback.zip'),
);
