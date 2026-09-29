import { defineShard } from 'anthelion';

import { getReleases } from '@/scripts/shards-lib/qualcomm-software-center';

const downloadPath = 'software/tools/Windows_Graphics_Driver/Windows/ARM64';

export default defineShard(async () => {
	// The version scheme changed from a build-stamped 260523131.0.152.1 to a dated
	// 2026.08.2, so take the newest release date rather than comparing version
	// strings - getReleases already returns them newest first.
	const releases = await getReleases('Windows_Graphics_Driver');
	const latest = releases.find(
		(release) =>
			release.targetOperatingSystem === 'Windows' &&
			release.targetArchitecture === 'ARM64' &&
			release.file?.downloadLink,
	);
	if (!latest) {
		throw new Error('No Windows ARM64 release found');
	}

	// The release notes PDF is named after the driver version, which a build-stamped
	// package version does not contain, so use the file name the API reports.
	const releaseNotes = latest.releaseNote
		? {
				releaseNotesUrl: `https://softwarecenter.qualcomm.com/api/download/${downloadPath}/${latest.version}/release-notes/${latest.releaseNote}`,
			}
		: undefined;

	return {
		version: latest.version,
		urls: () => [latest.file!.downloadLink],
		...(releaseNotes && { releaseNotes }),
	};
});
