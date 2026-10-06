import { defineShard } from 'anthelion';
import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

import { readLzxCab } from '@/scripts/shards-lib/lzx-cab';

export default defineShard(async () => {
	// The catalog SupportAssistInstaller.exe and the installed agent read to find the current MSIs
	const cab = new Uint8Array(
		await ky(
			'https://saupdates.dell.com/serviceability/catalog/SUPPORTASSISTAGENTCATALOG.CAB',
		).arrayBuffer(),
	);
	const file = readLzxCab(cab).get('SupportAssistCatalog.xml');
	if (!file) throw new Error('SupportAssistCatalog.xml missing from catalog cabinet');
	const catalog = new TextDecoder().decode(file);

	const latest = (architecture: string) =>
		[
			...catalog.matchAll(
				new RegExp(
					`<DownloadPathURL>(serviceability/Catalog/${architecture}/([\\d.]+)/SupportAssist_${architecture}\\.msi)</DownloadPathURL>`,
					'gi',
				),
			),
		]
			.map(([, path, version]) => ({ path: path!, version: version! }))
			.sort((a, b) => compareVersions(b.version, a.version))[0];

	const x64 = latest('x64');
	const arm64 = latest('Arm64');
	if (!x64 || !arm64) throw new Error('No SupportAssist MSIs in catalog');
	if (x64.version !== arm64.version) {
		throw new Error(`x64 (${x64.version}) and Arm64 (${arm64.version}) versions differ`);
	}

	return {
		version: x64.version,
		urls: () => [x64, arm64].map(({ path }) => `https://saupdates.dell.com/${path}`),
	};
});
