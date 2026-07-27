import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// The .NET 3.5 bundle carries no usable version of its own: productVersion and
// displayVersion both report burn's, not the runtime's. The Update Catalog
// lists each servicing release by KB, and its download dialog resolves to a
// permanent content-addressed URL, so take both from there. go.microsoft.com's
// fwlink is not used: it redirects, and it lags the catalog by a release.
const CATALOG = 'https://www.catalog.update.microsoft.com/Search.aspx?q=.NET%20Framework%203.5';
const DIALOG = 'https://www.catalog.update.microsoft.com/DownloadDialog.aspx';
const TITLE = /\.NET Framework 3\.5 Security Update \(KB(\d+)\)/i;
// The catalog is slow enough to blow ky's ten second default from CI.
const REQUEST = { timeout: 60_000, retry: 3 };

export default defineShard(async () => {
	const rows =
		(await ky(CATALOG, REQUEST).text()).match(/<tr[^>]*id="[^"]*_R\d+"[\s\S]*?<\/tr>/g) ?? [];
	const releases = rows
		.filter((row) => TITLE.test(row))
		.map((row) => ({
			kb: firstMatch(row, TITLE, 'No KB number in the catalog entry'),
			id: firstMatch(row, /id="([0-9a-f-]{36})"/i, 'No update identifier in the catalog entry'),
		}))
		.sort((a, b) => Number(b.kb) - Number(a.kb));
	const latest = releases[0];
	if (!latest) throw new Error('No .NET Framework 3.5 servicing release in the catalog');

	const dialog = await ky
		.post(DIALOG, {
			...REQUEST,
			body: new URLSearchParams({
				updateIDs: JSON.stringify([
					{ size: 0, languages: '', uidInfo: latest.id, updateID: latest.id },
				]),
			}),
		})
		.text();

	return {
		version: `3.5.${latest.kb}`,
		urls: [
			firstMatch(dialog, /'(https:\/\/[^']+\.exe)'/i, 'No download URL in the catalog dialog'),
		],
		replace: true,
	};
});
