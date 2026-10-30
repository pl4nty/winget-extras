import { S3Client } from 'bun';
import ky from 'ky';

// Some vendors serve installers that winget clients can't use directly: signed
// URLs that expire, downloads gated on a referer, or files rebuilt on every
// request. Shards for these packages copy the installer into the R2 bucket
// behind winget.tplant.com.au and point InstallerUrl at the copy.
//
// Anthelion only calls a shard's `urls` once it has decided to update, so
// call this from inside `urls` to copy nothing until a new version appears.

const bucket = new S3Client({
	bucket: 'winget-extras',
	endpoint: 'https://20e0944718a914755e926a8ac51178d7.r2.cloudflarestorage.com',
	accessKeyId: process.env.R2_ACCESS_KEY_ID,
	secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
});
// Some of these installers are over 100 MB.
const request = { timeout: 300_000, retry: 3 };

/**
 * Copy `url` to `download/<id path>/<version>/<fileName>` and return its
 * winget.tplant.com.au URL. Existing copies are never overwritten, so the
 * installer hash stays stable once a version is mirrored.
 */
export async function mirror(
	packageIdentifier: string,
	version: string,
	url: string,
	{
		fileName = new URL(url).pathname.split('/').at(-1),
		headers,
	}: { fileName?: string; headers?: Record<string, string> } = {},
) {
	if (!fileName) throw new Error(`No file name in ${url}`);
	const key = `download/${packageIdentifier.charAt(0).toLowerCase()}/${packageIdentifier.split('.').join('/')}/${version}/${fileName}`;
	const mirrored = `https://winget.tplant.com.au/${key}`;

	const existing = await ky.head(mirrored, { ...request, throwHttpErrors: false });
	if (existing.ok) return mirrored;
	if (existing.status !== 404) throw new Error(`Failed to check ${mirrored}: ${existing.status}`);

	// Test runs without R2 credentials, so it exercises the shard against the
	// vendor URL until Update Packages has made the copy.
	if (process.env.DRY_RUN) {
		console.warn(`${mirrored} does not exist yet, using ${url}`);
		return url;
	}

	await bucket.write(key, await ky(url, { ...request, headers }));
	return mirrored;
}
