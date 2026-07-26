import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const ARCHIVE_EXTENSIONS = ['.tar.gz', '.tgz', '.zip'];
const PINNED_REF = /^(refs\/tags\/.+|[0-9a-f]{7,64})$/i;

function refBeforePath(segments: string[]): string {
	const [first, second] = segments;
	const qualified = first === 'refs' && (second === 'heads' || second === 'tags');
	return segments.slice(0, qualified ? 3 : 1).join('/');
}

function archiveRef(segments: string[]): string {
	const value = segments.join('/');
	const extension = ARCHIVE_EXTENSIONS.find((candidate) => value.toLowerCase().endsWith(candidate));
	return extension ? value.slice(0, -extension.length) : value;
}

function downloadRef(url: URL): string | undefined {
	const [owner, repository, kind, ...rest] = url.pathname.split('/').filter(Boolean);
	if (!owner || !repository || !kind) return undefined;
	if (url.hostname === 'raw.githubusercontent.com') return refBeforePath([kind, ...rest]);
	if (url.hostname === 'codeload.github.com') return archiveRef(rest);
	if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') return undefined;
	if (kind === 'raw' || kind === 'blob') return refBeforePath(rest);
	return kind === 'archive' ? archiveRef(rest) : undefined;
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

			const ref = downloadRef(url);
			if (ref && !PINNED_REF.test(ref)) {
				report({
					message: `InstallerUrl must use a pinned tag or commit (found ${ref})`,
					search,
					level: 'warning',
				});
			}
		}
	},
});
