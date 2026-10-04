import { inflateSync, strFromU8 } from 'fflate';
import ky from 'ky';

const catalogUrl = 'https://downloads.dell.com/';

export interface CatalogComponent {
	path: string;
	releaseId: string;
	version: string;
}

/** Contents of a single-folder MSZIP cabinet, which is what Dell publishes its catalogs as. */
function readCab(cab: Uint8Array): Uint8Array {
	const view = new DataView(cab.buffer, cab.byteOffset, cab.byteLength);
	if (strFromU8(cab.subarray(0, 4)) !== 'MSCF') {
		throw new Error('Not a cabinet file');
	}

	let offset = 36;
	let dataReserve = 0;
	if (view.getUint16(30, true) & 4) {
		dataReserve = view.getUint8(39);
		offset += 4 + view.getUint16(36, true);
	}
	if (view.getUint16(26, true) !== 1 || view.getUint16(offset + 6, true) !== 1) {
		throw new Error('Expected a single MSZIP folder');
	}

	const blockCount = view.getUint16(offset + 4, true);
	const chunks: Uint8Array[] = [];
	let position = view.getUint32(offset, true);
	for (let i = 0; i < blockCount; i++) {
		const size = view.getUint16(position + 4, true);
		const start = position + 8 + dataReserve;
		if (strFromU8(cab.subarray(start, start + 2)) !== 'CK') {
			throw new Error('Bad MSZIP block signature');
		}
		// Each block's deflate stream may reference the previous block's output
		chunks.push(inflateSync(cab.subarray(start + 2, start + size), { dictionary: chunks.at(-1) }));
		position = start + size;
	}

	const out = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.length, 0));
	let written = 0;
	for (const chunk of chunks) {
		out.set(chunk, written);
		written += chunk.length;
	}
	return out;
}

async function fetchCatalog(path: string): Promise<string> {
	const cab = new Uint8Array(await ky(catalogUrl + path).arrayBuffer());
	return new TextDecoder('utf-16le').decode(readCab(cab));
}

function compareVersions(a: string, b: string): number {
	const [left, right] = [a, b].map((version) => version.split('.').map(Number));
	for (let i = 0; i < Math.max(left!.length, right!.length); i++) {
		const difference = (left![i] ?? 0) - (right![i] ?? 0);
		if (difference) return difference;
	}
	return 0;
}

/**
 * The newest x64 package Dell's catalogs list for a Dell Update Package component. The public
 * `CatalogPC.cab` lags releases by months, so read the per-model catalogs from the index instead,
 * most recently regenerated first. Dell publishes several builds of one version, some for a few
 * models only, so ties go to the build the most catalogs list - the one on the download page.
 */
export async function getLatestComponent(
	componentId: string,
	nameFilter: RegExp,
	modelCatalogs = 25,
): Promise<CatalogComponent> {
	const index = await fetchCatalog('catalog/CatalogIndexPC.cab');
	const paths = [
		...index.matchAll(/<ManifestInformation[^>]*creationDateTime="([^"]+)"[^>]*path="([^"]+)"/g),
	]
		.map(([, date, path]) => ({ date: date!, path: path! }))
		.sort((a, b) => b.date.localeCompare(a.date))
		.slice(0, modelCatalogs);

	const components = (await Promise.all(paths.map(({ path }) => fetchCatalog(path)))).flatMap(
		(catalog) =>
			catalog
				.split('<SoftwareComponent ')
				.slice(1)
				.filter((component) => component.includes(`componentID="${componentId}"`))
				.map((component): CatalogComponent | undefined => {
					const attribute = (name: string) => component.match(new RegExp(`${name}="([^"]+)"`))?.[1];
					const path = attribute('path');
					const releaseId = attribute('releaseID');
					const version = attribute('vendorVersion');
					return path && releaseId && version && nameFilter.test(path)
						? { path, releaseId, version }
						: undefined;
				})
				.filter((component) => component !== undefined),
	);

	const catalogCounts = Map.groupBy(components, ({ path }) => path);
	const latest = [...catalogCounts.values()].sort(
		(a, b) => compareVersions(b[0]!.version, a[0]!.version) || b.length - a.length,
	)[0]?.[0];
	if (!latest) {
		throw new Error(
			`No package for component ${componentId} in the newest ${modelCatalogs} catalogs`,
		);
	}
	return latest;
}
