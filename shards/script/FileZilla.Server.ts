import { defineShard } from 'anthelion';

import { fileZilla } from '@/scripts/shards-lib/FileZilla';

export default defineShard(async () => ({
	...(await fileZilla('FileZilla.Server', 'server', ['win64'])),
	releaseNotes: {
		releaseNotesUrl: 'https://filezilla-project.org/versions.php?type=server',
	},
}));
