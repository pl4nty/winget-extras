import { defineShard } from 'anthelion';
import { isStateMatching, komac } from 'anthelion/helpers';
import ky from 'ky';

const url = 'https://downloads.wdc.com/acronis/AcronisTrueImageWD_WIN.zip';
const installer = { url, nestedInstallerMatches: ['AcronisTrueImageWD_WIN.exe'] };

export default defineShard(async () => {
	const state = (await ky.head(url)).headers.get('etag');
	if (!state) {
		throw new Error('No ETag header found');
	}

	// The zip is ~1GB, so only analyse it when it has changed. Anthelion skips the update on a
	// matching state before it resolves the version
	if (
		await isStateMatching({ packageIdentifier: 'Acronis.TrueImage.WD', state, ignoreQuotes: true })
	) {
		return { version: { source: 'product' }, urls: () => [installer], state };
	}

	// The exe's string table writes its version with commas (30,0,1,42752), which komac takes verbatim
	const { versions } = await komac.analyzeInstaller(installer);
	if (!versions.product) {
		throw new Error('No ProductVersion found');
	}

	return { version: versions.product.replaceAll(/\s*,\s*/g, '.'), urls: () => [installer], state };
});
