import { groq } from '@ai-sdk/groq';
import type { AnthelionConfig } from 'anthelion/config';

export default {
	github: {
		targetRepository: {
			owner: 'pl4nty',
			repo: 'winget-extras',
			branch: 'main',
		},
	},
	releaseNotes: process.env.GROQ_API_KEY ? { model: groq('openai/gpt-oss-120b') } : undefined,
} satisfies AnthelionConfig;
