import { defineShard } from 'anthelion';
import { firstMatch } from 'anthelion/helpers';
import ky from 'ky';

// The fwlink serves whichever .NET 3.5 servicing bundle is current but carries
// no usable version of its own: both productVersion and displayVersion report
// burn's 1.0.03391.144 rather than the runtime's. The Update Catalog lists each
// servicing release with its exact byte count, so identify the bundle the
// fwlink is serving by size and take the KB from that row. The fwlink can lag
// the newest catalog entry, so correlate on size instead of taking the newest
// row, which would pair a newer KB with older bytes.
const INSTALLER = 'https://go.microsoft.com/fwlink/?LinkID=2337635';
const CATALOG = 'https://www.catalog.update.microsoft.com/Search.aspx?q=.NET%20Framework%203.5';
const TITLE = /\.NET Framework 3\.5 Security Update \(KB(\d+)\)/i;

export default defineShard(async () => {
	const size = (await ky.head(INSTALLER)).headers.get('content-length');
	if (!size || !/^\d+$/.test(size))
		throw new Error('No Content-Length for the .NET Framework 3.5 bundle');

	const rows = (await ky(CATALOG).text()).match(/<tr[^>]*id="[^"]*_R\d+"[\s\S]*?<\/tr>/g) ?? [];
	const row = rows.find(
		(entry) => TITLE.test(entry) && new RegExp(`>\\s*${size}\\s*<`).test(entry),
	);
	if (!row) throw new Error(`No catalog entry matches the ${size} byte bundle`);

	return {
		version: `3.5.${firstMatch(row, TITLE, 'No KB number found in the catalog entry')}`,
		urls: [INSTALLER],
		replace: true,
	};
});
