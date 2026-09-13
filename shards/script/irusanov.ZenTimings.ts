import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import { xml } from 'anthelion/strategies';

// GitHub's latest release tracks the beta line (e.g. v140.576), whose assets are
// named differently, so take the version from the updater feed, which only
// advertises stable builds. Its version carries a build component (1.39.487) that
// the release tag and asset names omit.
export default defineShard(async () => {
	const feed = await xml({
		url: 'https://zentimings.com/Update.xml',
		path: 'UpdaterArgs.0.Version.0',
	});

	const version = match(feed.version, /^(\d+\.\d+)/).groups[0];

	return {
		version,
		urls: () => [
			`https://github.com/irusanov/ZenTimings/releases/download/v${version}/ZenTimings_v${version}.zip`,
		],
	};
});
