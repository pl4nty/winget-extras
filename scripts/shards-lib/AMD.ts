import ky from 'ky';

import { mirrorFile } from '@/scripts/shards-lib/mirror';

export const headers = { 'User-Agent': 'winget-extras' };
export const driverHeaders = { ...headers, Referer: 'https://www.amd.com/' };

/** URL of a winget.tplant.com.au copy of a drivers.amd.com file, uploaded if missing. */
export function mirrorDriver(packageIdentifier: string, version: string, url: string) {
	return mirrorFile(packageIdentifier, version, url.split('/').at(-1)!, () =>
		ky(url, { headers: driverHeaders, timeout: 300_000, retry: 3 }),
	);
}
