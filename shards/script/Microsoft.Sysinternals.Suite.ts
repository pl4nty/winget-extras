import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

export default defineShard(async () => {
	const response = await ky.head('https://download.sysinternals.com/files/SysinternalsSuite.zip');
	const state = response.headers.get('last-modified') || '';
	const {
		groups: [day, monthStr, year],
	} = match(state, /^[A-Za-z]{3},\s+(\d{2})\s+([A-Za-z]{3})\s+(\d{4})/);

	const months: Record<string, string> = {
		Jan: '01',
		Feb: '02',
		Mar: '03',
		Apr: '04',
		May: '05',
		Jun: '06',
		Jul: '07',
		Aug: '08',
		Sep: '09',
		Oct: '10',
		Nov: '11',
		Dec: '12',
	};

	const version = `${year}-${months[monthStr!]}-${day}`;
	const urls = () => [
		'https://download.sysinternals.com/files/SysinternalsSuite.zip',
		'https://download.sysinternals.com/files/SysinternalsSuite-ARM64.zip',
	];

	return {
		version,
		urls,
		replace: true,
	};
});
