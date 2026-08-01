import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The .NET 3.5 bundle carries no usable version of its own: productVersion and
// displayVersion both report burn's, not the runtime's. The Update Catalog
// lists each servicing release by KB, and its download dialog resolves to a
// permanent content-addressed URL, so take both from there. go.microsoft.com's
// fwlink is not used: it redirects, and it lags the catalog by a release.
export default defineShard(async () => {
	const catalog = 'https://www.catalog.update.microsoft.com/Search.aspx?q=.NET%20Framework%203.5';
	const dialogUrl = 'https://www.catalog.update.microsoft.com/DownloadDialog.aspx';
	const title = /\.NET Framework 3\.5 Security Update \(KB(\d+)\)/i;
	// The catalog regularly exceeds ky's default ten-second timeout in CI.
	const request = { timeout: 60_000, retry: 3 };

	const response = await ky(catalog, request).text();
	const rows = Array.from(
		response.matchAll(/<tr[^>]*id="[^"]*_R\d+"[\s\S]*?<\/tr>/gi),
		([row]) => row,
	);
	const releases = rows
		.filter((row) => title.test(row))
		.map((row) => {
			const {
				groups: [kb],
			} = match(row, title, 'No KB number in the catalog entry');
			const {
				groups: [id],
			} = match(row, /id="([0-9a-f-]{36})"/i, 'No update identifier in the catalog entry');
			return { kb, id };
		})
		.sort((a, b) => Number(b.kb) - Number(a.kb));
	const latest = releases[0];
	if (!latest) {
		throw new Error('No .NET Framework 3.5 servicing release in the catalog');
	}

	const dialog = await ky
		.post(dialogUrl, {
			...request,
			body: new URLSearchParams({
				updateIDs: JSON.stringify([
					{ size: 0, languages: '', uidInfo: latest.id, updateID: latest.id },
				]),
			}),
		})
		.text();
	const {
		groups: [url],
	} = match(dialog, /'(https:\/\/[^']+\.exe)'/i, 'No download URL in the catalog dialog');

	const version = `3.5.${latest.kb}`;
	const urls = () => [url];

	return {
		version,
		urls,
	};
});
