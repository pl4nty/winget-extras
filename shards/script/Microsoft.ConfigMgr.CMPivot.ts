import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.CMPivot', 'CMPivot.msi', ['CMPivot/CMPivot.msi']),
);
