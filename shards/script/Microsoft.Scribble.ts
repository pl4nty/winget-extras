import { defineShard } from 'anthelion';

import { appxVersionAt } from '../../scripts/shard-lib/appx.ts';

// scribble.appx is a Git LFS object, so raw.githubusercontent.com only serves
// its pointer. github.com/raw redirects to the real file.
export default defineShard(async () => {
	const url =
		'https://github.com/microsoft/msix-packaging/raw/refs/heads/master/MsixCore/Tests/scribble.appx';
	const version = await appxVersionAt(url);

	return {
		version,
		urls: () => [url],
	};
});
