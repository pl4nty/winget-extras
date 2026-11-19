import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.ClientSpy', 'CliSpy.exe', ['ClientTools/CliSpy.exe']),
);
