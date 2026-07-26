import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const ARCHIVE_EXTENSIONS = ['.tar.gz', '.tgz', '.zip'];

/**
 * Tags and commit SHAs serve fixed bytes. Any other ref can move, and a URL
 * cannot say whether an unqualified ref such as `1.1.333` is a tag or a branch,
 * so only the qualified form counts as pinned.
 */
const PINNED_REF = /^(refs\/tags\/.+|[0-9a-f]{7,64})$/i;

/** `refs/heads/main/font.ttf` -> `refs/heads/main`; the rest is the file path. */
function refBeforePath(segments: string[]): string {
	const [first, second] = segments;
	const qualified = first === 'refs' && (second === 'heads' || second === 'tags');
	return segments.slice(0, qualified ? 3 : 1).join('/');
}

/** `refs/heads/main.zip` -> `refs/heads/main`. */
function archiveRef(segments: string[]): string {
	const value = segments.join('/');
	const extension = ARCHIVE_EXTENSIONS.find((candidate) => value.toLowerCase().endsWith(candidate));
	return extension ? value.slice(0, -extension.length) : value;
}

/** The ref a GitHub download reads from, if the URL names one. */
function downloadRef(url: URL): string | undefined {
	const [owner, repository, kind, ...rest] = url.pathname.split('/').filter(Boolean);
	if (!owner || !repository || !kind) return undefined;
	if (url.hostname === 'raw.githubusercontent.com') return refBeforePath([kind, ...rest]);
	if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return undefined;
	if (kind === 'raw' || kind === 'blob') return refBeforePath(rest);
	return kind === 'archive' ? archiveRef(rest) : undefined;
}

/** github.com serves every codeload.github.com archive under a stable URL. */
function unpinnedDownload(url: URL): string | undefined {
	if (url.hostname === 'codeload.github.com') {
		return 'InstallerUrl downloads from codeload.github.com instead of github.com';
	}
	const ref = downloadRef(url);
	return ref && !PINNED_REF.test(ref)
		? `InstallerUrl downloads from ${ref} instead of a pinned tag or commit`
		: undefined;
}

export const urlPinningRule = defineInstallerRule({
	id: 'installer/url-pinning',
	check({ installers, report }) {
		const reported = new Set<string>();
		for (const installer of installers) {
			const search = installer.InstallerUrl;
			const url = URL.parse(search ?? '');
			if (!url || reported.has(search)) continue;
			reported.add(search);

			const message = unpinnedDownload(url);
			if (message) report({ message, search, level: 'warning' });
		}
	},
});
