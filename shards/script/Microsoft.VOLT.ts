import { defineShard } from 'anthelion';
import ky from 'ky';

// aka.ms/MicrosoftVOLT is an alias, so resolve it and give komac the URL it
// redirects to. The URL also serves as the update state.
export default defineShard(async () => {
	const response = await ky.head('https://aka.ms/MicrosoftVOLT', {
		timeout: 60_000,
		retry: 3,
	});
	const url = response.url;
	if (new URL(url).hostname === 'aka.ms') {
		throw new Error('aka.ms did not redirect to the installer URL');
	}

	return {
		version: { source: 'display' },
		urls: () => [url],
		state: url,
	};
});
