import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Each Download Center locale page lists only its own MSI
const LOCALES = ['de-de', 'es-es', 'fr-fr', 'it-it', 'ja-jp', 'ko-kr', 'pt-br', 'zh-tw'];

type Details = {
	dlcDetailsView: { downloadFile: { name: string; url: string; version: string }[] };
};

async function getFile(locale: string) {
	const page = await ky(
		`https://www.microsoft.com/${locale}/download/details.aspx?id=103466`,
	).text();
	const { groups } = match(page, /<script>window\.__DLCDetails__=(\{.+?\})<\/script>/is);
	const { downloadFile } = (JSON.parse(groups[0]) as Details).dlcDetailsView;
	const file = downloadFile.find(({ name }) =>
		/^DB2OLEDBv7(?:\.[a-z]{2}-[A-Z]{2})?\.msi$/.test(name),
	);
	if (!file) throw new Error(`No DB2OLEDBv7 MSI on the ${locale} page`);
	return file;
}

export default defineShard(async () => {
	const [english, localized] = await Promise.all([
		getFile('en-us'),
		Promise.all(LOCALES.map(getFile)),
	]);

	return {
		version: english.version,
		urls: () => [english, ...localized].map(({ url }) => url),
	};
});
