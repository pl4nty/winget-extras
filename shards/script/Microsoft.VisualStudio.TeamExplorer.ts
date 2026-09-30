import { defineShard } from 'anthelion';
import ky from 'ky';

// aka.ms/vs/18/stable is an alias whose target changes with every release, so a
// manifest that pointed at it would stop matching its hash. Each release lives at
// its own permanent URL, so resolve the alias and give komac that URL. The URL
// also serves as the update state.
export default defineShard(async () => {
	const response = await ky.head('https://aka.ms/vs/18/stable/vs_TeamExplorer.exe', {
		timeout: 60_000,
		retry: 3,
	});
	const url = response.url;
	if (new URL(url).hostname === 'aka.ms') {
		throw new Error('aka.ms did not redirect to a release URL');
	}

	return {
		version: { source: 'file' },
		urls: () => [url],
		state: url,
	};
});
