import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const REF_PREFIXES = [
	['refs/heads/', 'branch'],
	['refs/tags/', 'tag'],
] as const;

/** An abbreviated or full commit SHA, the only unqualified ref that cannot move. */
const COMMIT_REF = /^[0-9a-f]{7,64}$/i;

const ARCHIVE_EXTENSIONS = ['.tar.gz', '.tgz', '.zip'];

const PIN_HINT =
	'write the ref as refs/tags/<tag> or a commit SHA so the download cannot change under InstallerSha256';

type GitRef = { name: string; kind: 'branch' | 'tag' | 'commit' | 'unqualified' };

type Finding = { message: string; hint: string };

/**
 * A URL cannot say whether an unqualified ref such as `1.1.333` is a tag or a
 * branch, so only `refs/tags` and commit SHAs count as pinned. That keeps every
 * branch download reported without resolving refs against GitHub.
 */
function namedRef(value: string): GitRef | undefined {
	for (const [prefix, kind] of REF_PREFIXES) {
		if (value.startsWith(prefix)) {
			const name = value.slice(prefix.length);
			return name ? { name, kind } : undefined;
		}
	}
	if (!value) return undefined;
	return { name: value, kind: COMMIT_REF.test(value) ? 'commit' : 'unqualified' };
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
function githubRef(url: URL, segments: string[]): GitRef | undefined {
	const host = url.hostname.toLowerCase();
	if (host === 'raw.githubusercontent.com') return namedRef(refBeforePath(segments.slice(2)));
	if (host !== 'github.com' && host !== 'www.github.com') return undefined;

	const tail = segments.slice(3);
	const kind = segments[2];
	if (kind === 'raw' || kind === 'blob') return namedRef(refBeforePath(tail));
	if (kind === 'archive') return namedRef(archiveRef(tail));
	return undefined;
}

/**
 * Reports downloads whose bytes are not fixed: anything served from a branch or
 * another ref that is not demonstrably a tag or commit, and anything served from
 * codeload.github.com, which github.com serves under a stable URL instead.
 */
function unpinnedDownload(value: string): Finding | undefined {
	let url: URL;
	try {
		url = new URL(value);
	} catch {
		return undefined;
	}

	const segments = url.pathname.split('/').filter(Boolean);
	if (url.hostname.toLowerCase() === 'codeload.github.com') {
		return {
			message: 'InstallerUrl downloads from codeload.github.com instead of github.com',
			hint: `use the equivalent https://github.com/<owner>/<repo>/archive/<ref> URL, and ${PIN_HINT}`,
		};
	}

	const ref = githubRef(url, segments);
	if (!ref || ref.kind === 'tag' || ref.kind === 'commit') return undefined;
	return {
		message:
			ref.kind === 'branch'
				? `InstallerUrl downloads from branch ${ref.name} instead of a pinned tag or commit`
				: `InstallerUrl downloads from ref ${ref.name}, which is not a pinned tag or commit`,
		hint: PIN_HINT,
	};
}

export const urlPinningRule = defineInstallerRule({
	id: 'installer/url-pinning',
	check({ installers, report }) {
		const reported = new Set<string>();
		for (const installer of installers) {
			const url = installer.InstallerUrl;
			if (typeof url !== 'string' || reported.has(url)) continue;

			const finding = unpinnedDownload(url);
			if (!finding) continue;

			reported.add(url);
			report({
				message: finding.message,
				search: url,
				hints: [finding.hint],
				level: 'warning',
			});
		}
	},
});
