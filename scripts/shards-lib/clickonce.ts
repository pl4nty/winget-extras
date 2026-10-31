import { match } from 'anthelion/helpers';
import { zipSync } from 'fflate';
import ky from 'ky';

// ClickOnce apps have no single download. The deployment manifest (.application) links the
// application manifest, which lists every file, so shards zip those for winget.

const request = { timeout: 300_000, retry: 3 };

const tags = (xml: string, name: string) => xml.match(new RegExp(`<${name}\\s[^>]*>`, 'g')) ?? [];
const attribute = (tag = '', name: string) =>
	match(tag, new RegExp(`\\s${name}="([^"]*)"`)).groups[0]!.replaceAll('\\', '/');

export async function readClickOnce(applicationUrl: string) {
	const application = await ky(applicationUrl, request).text();
	const manifestUrl = new URL(
		attribute(tags(application, 'dependentAssembly')[0], 'codebase'),
		applicationUrl,
	);
	// With mapFileExtensions, the server adds .deploy to each file
	const suffix = application.includes('mapFileExtensions="true"') ? '.deploy' : '';

	return {
		version: attribute(tags(application, 'assemblyIdentity')[0], 'version'),
		/** Zip of the app's files, laid out as ClickOnce installs them. */
		zip: async () => {
			const manifest = await ky(manifestUrl, request).text();
			const paths = [
				...tags(manifest, 'dependentAssembly')
					.filter((tag) => tag.includes('dependencyType="install"'))
					.map((tag) => attribute(tag, 'codebase')),
				...tags(manifest, 'file').map((tag) => attribute(tag, 'name')),
			];
			const files = await Promise.all(
				paths.map(
					async (path) =>
						[path, await ky(new URL(path + suffix, manifestUrl), request).bytes()] as const,
				),
			);
			return zipSync(Object.fromEntries(files));
		},
	};
}
