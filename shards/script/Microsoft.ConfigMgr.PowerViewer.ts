import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.PowerViewer', 'PowerVwr.exe', ['ClientTools/PowerVwr.exe']),
);
