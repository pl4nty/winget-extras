import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

// Qualcomm Software Center renders its catalog client-side, so the version is only
// available from the API behind it. That API rejects anonymous requests, and the
// `json` strategy can't send the public front-end API key the site's own bundle
// ships, so the lookup lives here. Product releases cover Linux and Windows across
// several versions, hence the filtering below.
const API = 'https://apigwx-aws.qualcomm.com/qsc/internal/v1';
const PRODUCT = 'Qualcomm_MDC';
const client = ky.create({
	headers: {
		Authorization: 'cB6AEvGlRqouLJdR5SBdbdqnqBGcVZq2m1Fixwk6gZgFwvJZ',
		'X-QCOM-TokenType': 'apikey',
	},
});

type Product = { id: string; name: string };
type Release = {
	version: string;
	targetOperatingSystem: string;
	file: { downloadLink: string };
};

export default defineShard(async () => {
	const { products } = await client
		.get(`${API}/products/`, { searchParams: { name: PRODUCT } })
		.json<{ products: Product[] }>();
	const product = products.find(({ name }) => name === PRODUCT);
	if (!product) throw new Error(`Expected a ${PRODUCT} product in the catalog`);

	const { releases } = await client
		.get(`${API}/products/${product.id}/releases`)
		.json<{ releases: Release[] }>();
	const windows = releases.filter(
		({ targetOperatingSystem }) => targetOperatingSystem === 'Windows',
	);
	if (!windows.length) throw new Error('Expected at least one Windows release');

	const version = windows
		.map(({ version }) => version)
		.sort(compareVersions)
		.at(-1)!;
	const urls = windows
		.filter((release) => release.version === version)
		.map(({ file }) => file.downloadLink)
		.sort();

	return { version, urls: () => urls };
});
