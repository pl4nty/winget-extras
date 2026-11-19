import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.PolicySpy', 'PolicySpy.exe', ['ClientTools/PolicySpy.exe']),
);
