import { defineShard } from 'anthelion';

import { buildVersionedTool } from '@/scripts/shards-lib/configmgr';

export default defineShard(() => buildVersionedTool('ClientSpy', 'CliSpy.exe'));
