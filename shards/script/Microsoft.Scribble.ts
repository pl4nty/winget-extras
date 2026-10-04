import { defineShard } from 'anthelion';

import { appxVersionAt } from '@/scripts/shards-lib/appx';

// scribble.appx is a Git LFS object, so raw.githubusercontent.com only serves
// its pointer. github.com/raw redirects to the real file. The file has not
// changed since 2019, so the URL is pinned to the release tag that carries it.
export default defineShard(async () => {
	const url =
		'https://github.com/microsoft/msix-packaging/raw/refs/tags/MSIX-Core-1.2-release/MsixCore/Tests/scribble.appx';
	const version = await appxVersionAt(url);

	return {
		version,
		urls: () => [url],
	};
});
