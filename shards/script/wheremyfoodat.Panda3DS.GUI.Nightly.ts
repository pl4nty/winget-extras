import { defineShard } from 'anthelion';
import { compareVersions, match } from 'anthelion/helpers';
import ky from 'ky';

const installerUrl =
	'https://nightly.link/wheremyfoodat/Panda3DS/workflows/Qt_Build/master/Windows%20executable.zip';

// The Qt frontend is only published as a GitHub Actions artifact, so nightly.link
// serves one fixed URL for the latest successful master build. CMakeLists.txt
// versions the emulator as `<latest tag without v>.<7 char commit>`, both of which
// the git refs advertisement carries without hitting the API. master can move
// hours before its build finishes, so key updates on the artifact itself rather
// than on the commit, otherwise a new version would be cut for the previous zip.
export default defineShard(async () => {
	const artifact = await ky(installerUrl, { headers: { Range: 'bytes=0-0' } });
	const state = artifact.headers.get('etag') ?? artifact.headers.get('last-modified');
	if (!state) {
		throw new Error('No ETag or Last-Modified header found');
	}

	const refs = await ky(
		'https://github.com/wheremyfoodat/Panda3DS/info/refs?service=git-upload-pack',
	).text();
	const {
		groups: [commit],
	} = match(refs, /([\da-f]{40}) refs\/heads\/master\n/);

	// Annotated tags advertise the tag object first and the commit it points at as
	// `<tag>^{}`, so the later entry wins and every tag maps to its commit.
	const tags = new Map(
		[...refs.matchAll(/([\da-f]{40}) refs\/tags\/v(\d+(?:\.\d+)*)(?:\^\{\})?\n/g)].map(
			([, sha, tag]): [string, string] => [tag!, sha!],
		),
	);
	const [tag, tagCommit] = [...tags].sort(([a], [b]) => compareVersions(b, a))[0]!;

	// git describe drops the revision when it lands exactly on a tag, as does CMake.
	const version = tagCommit === commit ? tag : `${tag}.${commit!.slice(0, 7)}`;

	return {
		version,
		urls: () => [installerUrl],
		state,
	};
});
