import { defineShard } from 'anthelion';
import ky from 'ky';

export default defineShard(async () => {
	const response = await ky.head(
		`https://persistent.oaistatic.com/codex-app-prod/ChatGPT-x64.msix`,
	);

	const version = response.headers.get('x-ms-meta-package_version')!;
	const urls = () => [
		`https://persistent.oaistatic.com/codex-app-prod/releases/${version}/ChatGPT-x64.msix`,
		`https://persistent.oaistatic.com/codex-app-prod/releases/${version}/ChatGPT-arm64.msix`,
	];

	return {
		version,
		urls,
	};
});
