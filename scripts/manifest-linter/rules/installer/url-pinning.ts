import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const REF_PATH = /^https:\/\/(?:www\.)?github\.com\/[^/]+\/[^/]+\/(?:raw|blob|archive)\/(.+)$/;
const PINNED_REF = /^(refs\/tags\/.+|[0-9a-f]{7,64})$/i;
const ARCHIVE_EXTENSION = /\.(tar\.gz|tgz|zip)$/i;

function downloadRef(installerUrl: string): string | undefined {
	const segments = REF_PATH.exec(installerUrl)?.[1].split('/') ?? [];
	const qualified = segments[0] === 'refs' && (segments[1] === 'heads' || segments[1] === 'tags');
	const ref = segments.slice(0, qualified ? 3 : 1).join('/');
	return ref.replace(ARCHIVE_EXTENSION, '') || undefined;
}

export const urlPinningRule = defineInstallerRule({
	id: 'installer/url-pinning',
	check({ installers, report }) {
		for (const installer of installers) {
			if (!installer.InstallerUrl) continue;
			const ref = downloadRef(installer.InstallerUrl);
			if (!ref || PINNED_REF.test(ref)) continue;
			report({
				message: `InstallerUrl must use a pinned tag or commit (found ${ref})`,
				search: installer.InstallerUrl,
				level: 'warning',
			});
		}
	},
});
