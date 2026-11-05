import { defineShard } from 'anthelion';

import { fileZilla } from '@/scripts/shards-lib/FileZilla';

export default defineShard(async () => fileZilla('FileZilla.Client', 'client', ['win32', 'win64']));
