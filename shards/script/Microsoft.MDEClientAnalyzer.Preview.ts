import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import { strFromU8, unzipSync } from 'fflate';
import ky from 'ky';

export default defineShard(async () => {
	const response = await ky('https://aka.ms/MDEClientAnalyzerPreview');
	const state = response.headers.get('etag') ?? response.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
	const script = files['MDEClientAnalyzer.ps1'];
	if (!script) {
		throw new Error('MDEClientAnalyzer.ps1 is missing from the archive');
	}

	const {
		groups: [day, monthName, year],
	} = match(strFromU8(script), /\$ScriptVer\s*=\s*"(\d{1,2})([a-z]{3})(\d{4})"/i);
	const months = [
		'jan',
		'feb',
		'mar',
		'apr',
		'may',
		'jun',
		'jul',
		'aug',
		'sep',
		'oct',
		'nov',
		'dec',
	];
	const month = months.indexOf(monthName!.toLowerCase()) + 1;
	if (month === 0) {
		throw new Error(`Unknown month in $ScriptVer: ${monthName}`);
	}

	const version = `${year}.${month}.${Number(day)}`;
	const urls = () => [{ url: response.url, architecture: 'x64' }];

	return {
		version,
		urls,
		state,
	};
});
