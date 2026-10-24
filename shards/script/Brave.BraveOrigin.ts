import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';

const installer = 'BraveOriginStandaloneSilentSetup.exe';

type Release = {
	tag_name: string;
	prerelease: boolean;
	draft: boolean;
	assets: { name: string }[];
};

// Only some brave-browser releases ship the Origin installer (the newest stable
// release may not), so take the newest one that does.
export default defineShard(async () => {
	const response = await fetch(
		'https://api.github.com/repos/brave/brave-browser/releases?per_page=100',
		{
			headers: {
				Accept: 'application/vnd.github+json',
				...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
			},
		},
	);
	if (!response.ok) throw new Error(`Failed to list brave-browser releases: ${response.status}`);

	const releases = (await response.json()) as Release[];
	const release = releases.find(
		(r) => !r.draft && !r.prerelease && r.assets.some((asset) => asset.name === installer),
	);
	if (!release) throw new Error(`No brave-browser release includes ${installer}`);

	const version = match(release.tag_name, /^v(\d+(?:\.\d+)+)$/).groups[0];
	return {
		version,
		urls: () => [
			`https://github.com/brave/brave-browser/releases/download/${release.tag_name}/${installer}`,
		],
	};
});
