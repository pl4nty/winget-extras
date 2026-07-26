import { defineInstallerRule } from '@/scripts/manifest-linter/rules/helpers';

const BANNED_HOSTS = new Set(['codeload.github.com', 'raw.githubusercontent.com']);

export const urlHostRule = defineInstallerRule({
	id: 'installer/url-host',
	check({ installers, report }) {
		const reported = new Set<string>();
		for (const installer of installers) {
			const search = installer.InstallerUrl;
			const host = URL.parse(search ?? '')?.hostname;
			if (!host || !BANNED_HOSTS.has(host) || reported.has(search)) continue;
			reported.add(search);

			report({
				message: `InstallerUrl must use github.com, not ${host}`,
				search,
				level: 'warning',
			});
		}
	},
});
