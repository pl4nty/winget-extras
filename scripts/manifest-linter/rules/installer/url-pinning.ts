import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

/**
 * Refs that keep moving. A download served from one of these can change after the
 * manifest is published, which leaves InstallerSha256 pointing at bytes that no
 * longer exist. Tags and commits are stable, so they are the preferred form.
 */
const MOVING_REFS = new Set([
	'canary',
	'default',
	'dev',
	'develop',
	'development',
	'edge',
	'gh-pages',
	'head',
	'latest',
	'main',
	'master',
	'next',
	'nightly',
	'release',
	'releases',
	'stable',
	'trunk',
]);

const REF_PREFIXES = [
	['refs/heads/', 'branch'],
	['refs/tags/', 'tag'],
] as const;

const ARCHIVE_EXTENSIONS = ['.tar.gz', '.tgz', '.zip'];

const CODELOAD_FORMATS = new Set(['zip', 'tar.gz', 'legacy.zip', 'legacy.tar.gz']);

type GitRef = { name: string; kind: 'branch' | 'tag' | 'other' };

function namedRef(value: string): GitRef | undefined {
	for (const [prefix, kind] of REF_PREFIXES) {
		if (value.startsWith(prefix)) {
			const name = value.slice(prefix.length);
			return name ? { name, kind } : undefined;
		}
	}
	return value ? { name: value, kind: 'other' } : undefined;
}

/**
 * Reads the ref from a `<ref>/<file path>` tail. A qualified ref keeps its
 * `refs/heads` or `refs/tags` prefix; anything else is a single bare segment
 * because the rest of the path belongs to the file.
 */
function refBeforePath(segments: string[]): string {
	const [first, second] = segments;
	if (first === 'refs' && (second === 'heads' || second === 'tags')) {
		return segments.slice(0, 3).join('/');
	}
	return first ?? '';
}

/** Reads the ref from an archive tail such as `refs/heads/main.zip`. */
function archiveRef(segments: string[]): string {
	const value = segments.join('/');
	const extension = ARCHIVE_EXTENSIONS.find((candidate) => value.toLowerCase().endsWith(candidate));
	return extension ? value.slice(0, -extension.length) : value;
}

/** Resolves the ref a GitHub download URL reads from, if it has one. */
function githubRef(value: string): GitRef | undefined {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return undefined;
	}

	const segments = url.pathname.split('/').filter(Boolean);
	const host = url.hostname.toLowerCase();
	if (host === 'raw.githubusercontent.com') return namedRef(refBeforePath(segments.slice(2)));
	if (host === 'codeload.github.com') {
		return CODELOAD_FORMATS.has(segments[2] ?? '')
			? namedRef(archiveRef(segments.slice(3)))
			: undefined;
	}
	if (host !== 'github.com' && host !== 'www.github.com') return undefined;

	const tail = segments.slice(3);
	const kind = segments[2];
	if (kind === 'raw' || kind === 'blob') return namedRef(refBeforePath(tail));
	if (kind === 'archive') return namedRef(archiveRef(tail));
	return undefined;
}

export const urlPinningRule = defineInstallerRule({
	id: 'installer/url-pinning',
	check({ installers, report }) {
		const reported = new Set<string>();
		for (const installer of installers) {
			const url = installer.InstallerUrl;
			if (typeof url !== 'string' || reported.has(url)) continue;

			const ref = githubRef(url);
			if (!ref || ref.kind === 'tag') continue;
			if (ref.kind !== 'branch' && !MOVING_REFS.has(ref.name.toLowerCase())) continue;

			reported.add(url);
			report({
				message: `InstallerUrl downloads from ${ref.kind === 'branch' ? 'branch' : 'moving ref'} ${ref.name} instead of a pinned tag or commit`,
				search: url,
				hints: [
					'pin the URL to refs/tags/<tag> or a commit SHA so the download cannot change under InstallerSha256',
				],
				level: 'warning',
			});
		}
	},
});
