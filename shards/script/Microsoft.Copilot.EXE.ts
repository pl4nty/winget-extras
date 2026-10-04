import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// The bootstrapper always installs the current build, so the version comes from
// the Edge update service that it queries, using the app ID embedded in the stub.
export default defineShard(async () => {
	const request = `<?xml version="1.0" encoding="UTF-8"?>
<request protocol="3.0" ismachine="1"><os platform="win" version="10.0.22631" arch="x64"/><app appid="{C50565E9-CCCF-44B4-BA15-5AC5C6569197}" version="0.0.0.0" installsource="ondemand"><updatecheck/></app></request>`;

	const response = await ky
		.post('https://msedge.api.cdp.microsoft.com/api/v2/update', {
			body: request,
			headers: { 'Content-Type': 'application/xml' },
			timeout: 30_000,
		})
		.text();

	const version = match(response, /<manifest[^>]*\sversion="(\d+(?:\.\d+)+)"/).groups[0];

	return {
		version,
		urls: () => [
			{ url: 'https://msedgesetup.microsoft.com/latest/UnifiedCopilotSetup.exe', architecture: 'x64' },
			{ url: 'https://msedgesetup.microsoft.com/latest/UnifiedCopilotSetup.exe', architecture: 'x86' },
			{ url: 'https://msedgesetup.microsoft.com/latest/UnifiedCopilotSetup.exe', architecture: 'arm64' },
		],
	};
});
