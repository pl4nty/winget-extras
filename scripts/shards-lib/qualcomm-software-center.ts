import { compareVersions, match } from 'anthelion/helpers';
import ky from 'ky';

interface ProductResponse {
	products: { id: string }[];
}

export interface Release {
	file?: { downloadLink: string };
	releaseBranch: string;
	releaseDate: string;
	releaseNote?: string;
	targetArchitecture: string;
	targetOperatingSystem: string;
	version: string;
}

const portalUrl = 'https://softwarecenter.qualcomm.com/';
const apiUrl = 'https://apigwx-aws.qualcomm.com/qsc/internal/v1';

// The public catalog uses an API key shipped in the current web client. Read
// the client configuration instead of baking that rotating key into a shard.
async function readClientConfig(): Promise<(key: string) => string> {
	const html = await ky(portalUrl).text();
	const moduleUrls = [...html.matchAll(/<link rel="modulepreload" href="([^"]+\.js)">/g)].map(
		([, path]) => new URL(path!, portalUrl),
	);
	const scripts = await Promise.all(moduleUrls.map((url) => ky(url).text()));
	const script = scripts.find((script) => script.includes('qscInternalApiKey:"'))!;
	const {
		groups: [config],
	} = match(script, /apigeeConfig:\{([^}]+)\}/);

	return (key) => match(config!, new RegExp(`${key}:"([^"]+)"`)).groups[0]!;
}

/**
 * Every release the catalog lists for a Software Center product, newest first.
 * `productName` is the catalog's own name, as it appears in a download path -
 * `Qualcomm_Launcher`, `Windows_Graphics_Driver`.
 */
export async function getReleases(productName: string): Promise<Release[]> {
	const getConfig = await readClientConfig();
	const headers = () => ({
		Accept: 'application/json',
		Authorization: getConfig('qscInternalApiKey'),
		'Content-Type': 'application/json',
		'X-QCOM-AppName': getConfig('appName'),
		'X-QCOM-ClientId': getConfig('clientId'),
		'X-QCOM-ClientType': getConfig('clientType'),
		'X-QCOM-TokenType': 'apikey',
		'X-QCOM-TracingID': crypto.randomUUID(),
	});

	const { products } = await ky
		.get(`${apiUrl}/products/`, {
			headers: headers(),
			searchParams: { name: productName },
		})
		.json<ProductResponse>();

	const { releases } = await ky
		.get(`${apiUrl}/products/${products[0]!.id}/releases`, {
			headers: headers(),
		})
		.json<{ releases: Release[] }>();

	return releases.sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
}

/**
 * Newest production release of a product for one target OS, and every download it
 * publishes for that version. `targetOperatingSystem` is the catalog's own value:
 * `Windows` for a per-platform release, `All` when one archive carries every
 * platform. Products whose version scheme has changed over time need
 * {@link getReleases} instead, since this compares version strings.
 */
export async function getLatestRelease(
	productName: string,
	targetOperatingSystem: string,
): Promise<{ version: string; urls: string[] }> {
	const candidates = (await getReleases(productName))
		.filter(
			(release) =>
				release.releaseBranch === 'Production' &&
				release.targetOperatingSystem === targetOperatingSystem &&
				release.file?.downloadLink,
		)
		.sort((a, b) => compareVersions(b.version, a.version));
	const version = candidates[0]!.version;

	return {
		version,
		urls: [
			...new Set(
				candidates
					.filter((release) => release.version === version)
					.map((release) => release.file!.downloadLink),
			),
		],
	};
}
