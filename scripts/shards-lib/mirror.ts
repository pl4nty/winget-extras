import { S3Client } from 'bun';
import ky from 'ky';

// For vendor files that can't be an InstallerUrl, e.g. signed URLs that expire or files inside
// an archive winget can't open. Call from a shard's `urls`, which Anthelion only runs when updating.

const bucket = new S3Client({
	bucket: 'winget-extras',
	endpoint: 'https://20e0944718a914755e926a8ac51178d7.r2.cloudflarestorage.com',
});
const request = { timeout: 300_000, retry: 3 };

/** URL of a winget.tplant.com.au copy of `url`, uploaded if missing. */
export function mirror(
	packageIdentifier: string,
	version: string,
	url: string,
	// For URLs whose last segment isn't a file name komac accepts
	fileName = new URL(url).pathname.split('/').at(-1)!,
) {
	return mirrorFile(packageIdentifier, version, fileName, () => ky(url, request), url);
}

/** Like `mirror`, for a file the shard builds itself, e.g. extracted from a vendor archive. */
export async function mirrorFile(
	packageIdentifier: string,
	version: string,
	fileName: string,
	build: () => Promise<Blob | Response | Uint8Array>,
	// Test has no R2 credentials, so it analyses this instead of a missing copy
	dryRunUrl?: string,
) {
	const key = `download/${packageIdentifier.charAt(0).toLowerCase()}/${packageIdentifier.split('.').join('/')}/${version}/${fileName}`;
	const mirrored = `https://winget.tplant.com.au/${encodeURI(key)}`;

	const { status } = await ky.head(mirrored, { ...request, throwHttpErrors: false });
	if (status === 200) {
		return mirrored;
	}
	if (status !== 404) {
		throw new Error(`Failed to check ${mirrored}: ${status}`);
	}
	if (process.env.DRY_RUN) {
		if (dryRunUrl) {
			return dryRunUrl;
		}
		throw new Error(`${mirrored} is not mirrored yet, Update Packages uploads it`);
	}
	await bucket.write(key, await build());
	return mirrored;
}
