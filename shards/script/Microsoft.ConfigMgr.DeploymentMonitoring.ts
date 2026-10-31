import { defineShard } from 'anthelion';

import { configMgrTool } from '@/scripts/shards-lib/Microsoft.ConfigMgr';

export default defineShard(() =>
	configMgrTool('Microsoft.ConfigMgr.DeploymentMonitoring', 'DeploymentMonitoringTool.exe', [
		'ClientTools/DeploymentMonitoringTool.exe',
	]),
);
