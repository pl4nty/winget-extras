import { defineShard } from 'anthelion';
import { sortVersions } from 'anthelion/strategies';

// The download portal indexes every build as a four-part version, which the
// installer URL needs, but the package is versioned by the first three
// components.
export default defineShard(async () => {
	const { version: build } = await sortVersions({
		url: 'https://my.mailstore.com/downloads/',
		regex: /"version":\s*"(\d+(?:\.\d+)+)",\s*"product":\s*"OutlookAddin"/i,
	});

	return {
		version: build.split('.').slice(0, 3).join('.'),
		urls: () => [
			`https://download.mailstore.com/dont-link-this/36B44217-2BF0-4603-8160-35DF2A708DC3/${build}/MailStoreOutlookAddinSetup-${build}.msi`,
		],
	};
});
