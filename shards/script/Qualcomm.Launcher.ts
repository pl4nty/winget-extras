import { defineShard } from 'anthelion';
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

export default defineShard(async () => {
	// The public catalog uses an API key shipped in the current web client. Read
	// the client configuration instead of baking that rotating key into the shard.
	const portalUrl = 'https://softwarecenter.qualcomm.com/';
	const html = await ky(portalUrl).text();
	const moduleUrls = [...html.matchAll(/<link rel="modulepreload" href="([^"]+\.js)">/g)].map(
		([, path]) => new URL(path!, portalUrl),
	);
	const scripts = await Promise.all(moduleUrls.map((url) => ky(url).text()));
	const script = scripts.find((script) => script.includes('qscInternalApiKey:"'))!;
	const {
		groups: [config],
	} = match(script, /apigeeConfig:\{([^}]+)\}/);
	const getConfig = (key: string) => match(config!, new RegExp(`${key}:"([^"]+)"`)).groups[0]!;

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
	const apiUrl = 'https://apigwx-aws.qualcomm.com/qsc/internal/v1';
	const { products } = await ky
		.get(`${apiUrl}/products/`, {
			headers: headers(),
			searchParams: { name: 'Qualcomm_Launcher' },
		})
		.json<ProductResponse>();

	const { releases } = await ky
		.get(`${apiUrl}/products/${products[0]!.id}/releases`, {
			headers: headers(),
		})
		.json<ReleaseResponse>();
	const windowsReleases = releases
		.filter(
			(release) =>
				release.releaseBranch === 'Production' &&
				release.targetOperatingSystem === 'Windows' &&
				release.file?.downloadLink,
		)
		.sort((a, b) => compareVersions(b.version, a.version));
	const version = windowsReleases[0]!.version;

	const urls = () => [
		...new Set(
			windowsReleases
				.filter((release) => release.version === version)
				.map((release) => release.file!.downloadLink),
		),
	];

	return { version, urls };
});
