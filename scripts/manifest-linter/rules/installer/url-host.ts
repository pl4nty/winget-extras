import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const BANNED_HOSTS = ['codeload.github.com', 'raw.githubusercontent.com'];

export const urlHostRule = defineInstallerRule({
	id: 'installer/url-host',
	check({ installers, report }) {
		for (const installer of installers) {
			const url = String(installer.InstallerUrl ?? '');
			const host = BANNED_HOSTS.find((banned) => url.startsWith(`https://${banned}/`));
			if (!host) continue;
			report({
				message: `InstallerUrl must use github.com, not ${host}`,
				search: url,
				level: 'warning',
			});
		}
	},
});
