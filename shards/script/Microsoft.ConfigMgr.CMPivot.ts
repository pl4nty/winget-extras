import { defineShard } from 'anthelion';

import { releaseVersionedTool } from '@/scripts/shards-lib/configmgr';

export default defineShard(() => releaseVersionedTool('CMPivot', 'CMPivot.msi'));
