import { zipSync } from 'fflate';
import ky from 'ky';

// ClickOnce apps have no single download: the deployment manifest (.application) points at an
// application manifest, which lists every file of the app. Shards zip those files for winget.

const request = { timeout: 300_000, retry: 3 };

function tags(xml: string, name: string) {
	return Array.from(xml.matchAll(new RegExp(`<${name}\\s[^>]*>`, 'g')), ([tag]) => tag);
}

function attribute(tag: string | undefined, name: string) {
	const value = tag?.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
	if (value === undefined) {
		throw new Error(`No ${name} attribute in ${tag}`);
	}
	return value
		.replaceAll('&quot;', '"')
		.replaceAll('&apos;', "'")
		.replaceAll('&lt;', '<')
		.replaceAll('&gt;', '>')
		.replaceAll('&amp;', '&');
}

function resolve(path: string, base: string | URL) {
	return new URL(path.replaceAll('\\', '/'), base);
}

export async function readClickOnce(applicationUrl: string) {
	const application = await ky(applicationUrl, request).text();
	const version = attribute(tags(application, 'assemblyIdentity')[0], 'version');
	const manifestUrl = resolve(
		attribute(tags(application, 'dependentAssembly')[0], 'codebase'),
		applicationUrl,
	);
	// With mapFileExtensions, the server holds each file with a .deploy suffix
	const suffix = /\smapFileExtensions="true"/.test(tags(application, 'deployment')[0] ?? '')
		? '.deploy'
		: '';

	/** Zip of the app's files, laid out as ClickOnce installs them. */
	async function zip() {
		const manifest = await ky(manifestUrl, request).text();
		const paths = [
			...tags(manifest, 'dependentAssembly')
				.filter((tag) => /\sdependencyType="install"/.test(tag))
				.map((tag) => attribute(tag, 'codebase')),
			...tags(manifest, 'file').map((tag) => attribute(tag, 'name')),
		].map((path) => path.replaceAll('\\', '/'));

		const files = await Promise.all(
			paths.map(
				async (path) =>
					[path, await ky(resolve(path + suffix, manifestUrl), request).bytes()] as const,
			),
		);
		return zipSync(Object.fromEntries(files));
	}

	return { version, zip };
}
