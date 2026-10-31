import { defineShard } from 'anthelion';

import { buildVersionedTool } from '@/scripts/shards-lib/configmgr';

export default defineShard(() => buildVersionedTool('PowerViewer', 'PowerVwr.exe'));
