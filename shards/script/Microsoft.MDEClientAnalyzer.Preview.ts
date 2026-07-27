import { defineShard } from 'anthelion';

import { analyzerShard } from '@/scripts/mde-analyzer';

export default defineShard(() => analyzerShard('https://aka.ms/MDEClientAnalyzerPreview'));
