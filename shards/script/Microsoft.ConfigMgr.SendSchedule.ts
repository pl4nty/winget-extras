import { defineShard } from 'anthelion';

import { buildVersionedTool } from '@/scripts/shards-lib/configmgr';

export default defineShard(() =>
	buildVersionedTool('SendSchedule', 'Microsoft.ConfigMgr.SendSchedule.zip'),
);
