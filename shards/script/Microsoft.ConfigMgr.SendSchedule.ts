import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.SendSchedule', 'Microsoft.ConfigMgr.SendSchedule.zip', [
		'ClientTools/SendSchedule.exe',
		'ClientTools/SendScheduleMessages.xml',
		'ClientTools/Microsoft.Diagnostics.Tracing.EventSource.dll',
	]),
);
