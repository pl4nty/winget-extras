import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const DOWNLOAD_KINDS = ['raw', 'blob', 'archive'];
const PINNED_REF = /^refs\/tags\/|^[0-9a-f]{7,64}([./]|$)/i;

export const githubPinningRule = defineInstallerRule({
	id: 'installer/github-pinning',
	check({ installers, report }) {
		for (const installer of installers) {
			const url = URL.parse(installer.InstallerUrl ?? '');
			if (url?.hostname !== 'github.com') continue;
			const [, , , kind, ...refPath] = url.pathname.split('/');
			const ref = refPath.join('/');
			if (!kind || !DOWNLOAD_KINDS.includes(kind) || !ref || PINNED_REF.test(ref)) continue;
			report({
				message: 'InstallerUrl must use a pinned tag or commit',
				search: installer.InstallerUrl,
				level: 'warning',
			});
		}
	},
});
