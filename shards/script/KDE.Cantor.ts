import { defineShard } from 'anthelion';

const base = 'https://cdn.kde.org/ci-builds/education/cantor/';

async function getText(url: string) {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`${url} returned ${response.status}`);
	return response.text();
}

// KDE keeps one CI build per release series (release-YY.MM), so the series directory and the
// build number in its filename both have to be discovered
export default defineShard(async () => {
	const series = [...(await getText(base)).matchAll(/href="release-(\d+)\.(\d+)\/"/gi)]
		.map(([, year, month]) => ({
			year: Number(year),
			month: Number(month),
			name: `${year}.${month}`,
		}))
		.toSorted((a, b) => b.year - a.year || b.month - a.month)[0];
	if (!series) throw new Error('no release series found');

	const dir = `${base}release-${series.name}/windows/`;
	const build = [
		...(await getText(dir)).matchAll(
			/href="(cantor-release_\d+\.\d+-(\d+)-windows-cl-msvc2022-x86_64\.exe)"/gi,
		),
	]
		.map(([, file, number]) => ({ file, number: Number(number) }))
		.toSorted((a, b) => b.number - a.number)[0];
	if (!build) throw new Error(`no Windows installer found in ${dir}`);

	return {
		version: `${series.name}.${build.number}`,
		urls: () => [`${dir}${build.file}`],
	};
});
