import { defineShard } from 'anthelion';
import ky from 'ky';

// softwarecenter.qualcomm.com renders its catalog client-side, so the Software Center
// API is the only place the current version appears. It rejects requests without the
// public key the web app ships in its bundle, which no declarative strategy can send.
// The version scheme changed from a build-stamped 260523131.0.152.1 to a dated
// 2026.08.2, so take the newest release date rather than comparing version strings.
const PRODUCT_ID = '2b7df486-01fc-11ef-b3d2-06ef9a91c98d';
const API_KEY = 'cB6AEvGlRqouLJdR5SBdbdqnqBGcVZq2m1Fixwk6gZgFwvJZ';
const DOWNLOAD_PATH = 'software/tools/Windows_Graphics_Driver/Windows/ARM64';

interface Release {
	version: string;
	releaseDate: string;
	releaseNote?: string;
	targetOperatingSystem: string;
	targetArchitecture: string;
	file: { downloadLink: string };
}

export default defineShard(async () => {
	const { releases } = await ky(
		`https://apigwx-aws.qualcomm.com/qsc/internal/v1/products/${PRODUCT_ID}/releases`,
		{ headers: { authorization: API_KEY, 'x-qcom-tokentype': 'apikey' } },
	).json<{ releases: Release[] }>();

	let newest: Release | undefined;
	for (const release of releases) {
		if (release.targetOperatingSystem !== 'Windows') continue;
		if (release.targetArchitecture !== 'ARM64') continue;
		if (!newest || release.releaseDate > newest.releaseDate) newest = release;
	}
	if (!newest) {
		throw new Error('No Windows ARM64 release found');
	}

	const latest = newest;
	// The release notes PDF is named after the driver version, which a build-stamped
	// package version does not contain, so use the file name the API reports.
	const releaseNotes = latest.releaseNote
		? {
				releaseNotesUrl: `https://softwarecenter.qualcomm.com/api/download/${DOWNLOAD_PATH}/${latest.version}/release-notes/${latest.releaseNote}`,
			}
		: undefined;

	return {
		version: latest.version,
		urls: () => [latest.file.downloadLink],
		...(releaseNotes && { releaseNotes }),
	};
});
