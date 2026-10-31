import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.ClientTools', 'ClientTools.zip', [
		'ClientTools/CliSpy.exe',
		'ClientTools/DeploymentMonitoringTool.exe',
		'ClientTools/Microsoft.Diagnostics.Tracing.EventSource.dll',
		'ClientTools/PolicySpy.exe',
		'ClientTools/PowerVwr.exe',
		'ClientTools/SendSchedule.exe',
		'ClientTools/SendScheduleMessages.xml',
	]),
);
