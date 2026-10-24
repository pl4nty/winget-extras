import { defineShard } from 'anthelion';
import { match } from 'anthelion/helpers';
import ky from 'ky';

// Brother's download list often takes over 20s to render on a cold cache, past the 10s default timeout.
export default defineShard(async () => {
	const page = await ky(
		'https://support.brother.com/g/b/downloadlist.aspx?c=us&lang=en&prod=p750weus&os=10069',
		{ timeout: 60_000 },
	).text();
	const version = match(page, /P-touch Editor6\.x[\s\S]*?\((\d+\.\d+\.\d+)\)/).groups[0];
	const urls = () => [
		`https://download.brother.com/pub/com/p-touch/editor6/pew${version.replaceAll('.', '_')}.exe`,
	];
	return { version, urls };
});
