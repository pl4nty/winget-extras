import { compareVersions } from 'anthelion/helpers';
import ky from 'ky';

// The Configuration Manager tools only ship inside the site server install, so there is no
// vendor download to point komac at. Microsoft lists each current branch release and its
// baseline build on Learn, which is enough to notice a new release. Binaries are extracted
// by hand and uploaded to the self-hosted mirror at the path these shards return.
const updatesUrl = 'https://learn.microsoft.com/en-us/intune/configmgr/core/servers/manage/updates';
const mirrorUrl = 'https://winget.tplant.com.au/download/m/Microsoft/ConfigMgr';

export interface ConfigMgrRelease {
	/** Release name, e.g. 2509 */
	name: string;
	/** Baseline build as Learn writes it, e.g. 5.00.9152.1000 (older rows omit the last segment) */
	build: string;
}

export async function getLatestRelease(): Promise<ConfigMgrRelease> {
	const page = await ky(updatesUrl, { timeout: 30_000, retry: 3 }).text();
	const releases = Array.from(
		page.matchAll(/<strong>(\d{4})<\/strong><\/a><br>\s*\((5\.00\.\d+(?:\.\d+)?)\)/g),
		([, name, build]) => ({ name: name!, build: build! }),
	).sort((a, b) => compareVersions(b.build, a.build));
	const latest = releases[0];
	if (!latest) {
		throw new Error('No Configuration Manager releases found');
	}
	return latest;
}

/**
 * Shard result for a tool versioned like the site build (5.0.9141.1002). The baseline build is
 * the best guess for a new release: hotfix rollups bump the last segment.
 */
export async function buildVersionedTool(tool: string, file: string) {
	const release = await getLatestRelease();
	const [, , build, revision = '1000'] = release.build.split('.');
	const version = `5.0.${build}.${revision}`;
	return {
		version,
		urls: () => [`${mirrorUrl}/${tool}/${version}/${file}`],
		state: release.build,
	};
}

/**
 * Shard result for an MSI versioned by release (5.2509.1036.1000), whose build segments cannot be
 * derived from the site build. The mirror path is keyed by release name, and komac reads the
 * version from the uploaded MSI.
 */
export async function releaseVersionedTool(tool: string, file: string) {
	const release = await getLatestRelease();
	return {
		version: { source: 'product' as const },
		urls: () => [`${mirrorUrl}/${tool}/${release.name}/${file}`],
		state: release.build,
	};
}
