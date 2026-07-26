import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const BANNED_HOSTS = /^https:\/\/(codeload\.github\.com|raw\.githubusercontent\.com)\//;

export const urlHostRule = defineInstallerRule({
	id: 'installer/url-host',
	check({ installers, report }) {
		for (const installer of installers) {
			if (!installer.InstallerUrl) continue;
			const host = BANNED_HOSTS.exec(installer.InstallerUrl)?.[1];
			if (!host) continue;
			report({
				message: `InstallerUrl must use github.com, not ${host}`,
				search: installer.InstallerUrl,
				level: 'warning',
			});
		}
	},
});
