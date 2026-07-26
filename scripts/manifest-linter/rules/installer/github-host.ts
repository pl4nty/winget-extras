import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const BANNED_HOSTS = ['codeload.github.com', 'raw.githubusercontent.com'];

export const githubHostRule = defineInstallerRule({
	id: 'installer/github-host',
	check({ installers, report }) {
		for (const installer of installers) {
			const host = URL.parse(installer.InstallerUrl ?? '')?.hostname;
			if (!host || !BANNED_HOSTS.includes(host)) continue;
			report({
				message: `InstallerUrl must use github.com, not ${host}`,
				search: installer.InstallerUrl,
				level: 'warning',
			});
		}
	},
});
