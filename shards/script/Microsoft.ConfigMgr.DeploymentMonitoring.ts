import { defineShard } from 'anthelion';

import { buildVersionedTool } from '@/scripts/shards-lib/configmgr';

export default defineShard(() =>
	buildVersionedTool('DeploymentMonitoring', 'DeploymentMonitoringTool.exe'),
);
