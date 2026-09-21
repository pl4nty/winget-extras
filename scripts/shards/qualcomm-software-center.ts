import { compareVersions, match } from 'anthelion/helpers';
import ky from 'ky';

interface ProductResponse {
	products: { id: string }[];
}

interface ReleaseResponse {
	releases: {
		file?: { downloadLink: string };
		releaseBranch: string;
		targetOperatingSystem: string;
		version: string;
	}[];
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
 * Latest production release of a Software Center product, and every download it
 * publishes for that version. `targetOperatingSystem` is the catalog's own value:
 * `Windows` for a per-platform release, `All` when one archive carries every
 * platform.
 */
export async function getLatestRelease(
	productName: string,
	targetOperatingSystem: string,
): Promise<{ version: string; urls: string[] }> {
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
		.json<ReleaseResponse>();
	const candidates = releases
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
