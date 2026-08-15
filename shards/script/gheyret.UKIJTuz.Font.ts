import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { komac, match } from 'anthelion/helpers';

// The UKIJ Tuz name table records "Version 3.10 April 8, 2011", so the font
// version arrives with the release date attached and needs trimming.
export default defineShard(async () => {
	const release = await getLatestRelease({
		owner: 'gheyret',
		repo: 'UyghurEditPP',
	});

	const { versions } = await komac.analyzeInstaller({
		installer: `https://raw.githubusercontent.com/gheyret/UyghurEditPP/${release.rawTag}/UKIJTuz.ttf`,
	});
	const version = match(versions.font, /^(\d+(?:\.\d+)+)/).groups[0];

	const urls = () => [
		{
			url: `https://github.com/gheyret/UyghurEditPP/releases/download/${release.rawTag}/UyghurEditPP.zip`,
			nestedInstallerMatches: ['UyghurEditPP/UKIJTuz'],
		},
	];

	return {
		version,
		urls,
	};
});
