import { githubClient } from 'anthelion/github';
import ky from 'ky';

// Helpers for font repos that publish no versioned releases. Lives outside
// shards/ because the Test workflow treats every changed file under shards/**
// as a package.

// Reads name ID 5 from a font's name table.
function fontVersion(bytes: Uint8Array): string {
	const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
	const numTables = view.getUint16(4);
	for (let i = 0; i < numTables; i++) {
		const record = 12 + i * 16;
		if (String.fromCharCode(...bytes.subarray(record, record + 4)) !== 'name') continue;
		const table = view.getUint32(record + 8);
		const count = view.getUint16(table + 2);
		const storage = table + view.getUint16(table + 4);
		for (let j = 0; j < count; j++) {
			const name = table + 6 + j * 12;
			if (view.getUint16(name + 6) !== 5) continue;
			const length = view.getUint16(name + 8);
			const offset = storage + view.getUint16(name + 10);
			let text = '';
			if (view.getUint16(name) === 1)
				text = String.fromCharCode(...bytes.subarray(offset, offset + length));
			else
				for (let k = 0; k < length; k += 2) text += String.fromCharCode(view.getUint16(offset + k));
			const version = /\d+(?:\.\d+)+/.exec(text)?.[0];
			if (version) return version;
		}
	}
	throw new Error('No version found in font name table');
}

/** Newest commit on the repo's default branch. */
export async function headCommit(owner: string, repo: string): Promise<string> {
	const [head] = await githubClient.rest.repos
		.listCommits({ owner, repo, per_page: 1 })
		.then(({ data }) => data);
	if (!head) throw new Error('No commits found');
	return head.sha;
}

/**
 * Tracks the default branch, pinning URLs to its head commit and taking the
 * version from `path`'s name table. `urls` defaults to the repo archive.
 */
export async function branchFontShard({
	owner,
	repo,
	path,
	urls = (sha) => [`https://github.com/${owner}/${repo}/archive/${sha}.zip`],
}: {
	owner: string;
	repo: string;
	path: string;
	urls?: (sha: string) => string[];
}) {
	const sha = await headCommit(owner, repo);
	const font = await ky(
		`https://raw.githubusercontent.com/${owner}/${repo}/${sha}/${path}`,
	).arrayBuffer();

	return {
		version: () => fontVersion(new Uint8Array(font)),
		urls: urls(sha),
		state: sha,
	};
}
