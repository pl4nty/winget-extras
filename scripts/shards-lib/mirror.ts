import { S3Client } from 'bun';
import ky from 'ky';

// For vendor URLs that can't be an InstallerUrl, e.g. signed URLs that expire.
// Call from a shard's `urls`, which Anthelion only runs when updating.

const bucket = new S3Client({
	bucket: 'winget-extras',
	endpoint: 'https://20e0944718a914755e926a8ac51178d7.r2.cloudflarestorage.com',
});
const request = { timeout: 300_000, retry: 3 };

/** URL of a winget.tplant.com.au copy of `url`, uploaded if missing. */
export async function mirror(packageIdentifier: string, version: string, url: string) {
	const fileName = new URL(url).pathname.split('/').at(-1);
	const key = `download/${packageIdentifier.charAt(0).toLowerCase()}/${packageIdentifier.split('.').join('/')}/${version}/${fileName}`;
	const mirrored = `https://winget.tplant.com.au/${key}`;

	const { status } = await ky.head(mirrored, { ...request, throwHttpErrors: false });
	if (status === 200) {
		return mirrored;
	}
	if (status !== 404) {
		throw new Error(`Failed to check ${mirrored}: ${status}`);
	}
	// Fork PRs have no R2 credentials
	if (!process.env.AWS_ACCESS_KEY_ID) {
		return url;
	}
	await bucket.write(key, await ky(url, request));
	return mirrored;
}
