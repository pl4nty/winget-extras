import { defineShard } from 'anthelion';

import { releaseVersionedTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	releaseVersionedTool('SupportCenter', 'SupportCenterInstaller.msi'),
);
