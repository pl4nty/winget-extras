import { glob, mkdir, readFile, rename, rmdir, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';

const [from, to] = process.argv.slice(2);

if (!from || !to) {
	throw new Error('usage: bun manifests:move <old identifier> <new identifier>');
}

const packagePath = (root: string, identifier: string) => {
	return join(root, identifier[0]!.toLowerCase(), ...identifier.split('.'));
};

const manifestPath = packagePath('manifests', from);
const root = await stat(manifestPath).then(
	() => 'manifests',
	() => 'fonts',
);
const oldPath = root === 'manifests' ? manifestPath : packagePath(root, from);
const newPath = packagePath(root, to);

const shardIdentifier = root === 'fonts' ? `${from}.Font` : from;
const newShardIdentifier = root === 'fonts' ? `${to}.Font` : to;
const shard = (
	await Array.fromAsync(
		glob(`shards/{json,script}/${shardIdentifier}.{json,json.disabled,ts,ts.disabled,.disabled}`),
	)
)[0];

for (const relativeFile of await Array.fromAsync(
	glob('**/*.yaml', { cwd: oldPath, withFileTypes: false }),
)) {
	const oldFile = join(oldPath, relativeFile);
	const newFile = join(dirname(oldFile), basename(oldFile).replace(from, to));

	await writeFile(
		oldFile,
		(await readFile(oldFile, 'utf8')).replaceAll(
			`PackageIdentifier: ${from}`,
			`PackageIdentifier: ${to}`,
		),
	);
	if (newFile !== oldFile) await rename(oldFile, newFile);
}

await mkdir(dirname(newPath), { recursive: true });
await rename(oldPath, newPath);

if (shard) {
	await rename(shard, shard.replace(shardIdentifier, newShardIdentifier));
}

for (let path = dirname(oldPath); path !== root; path = dirname(path)) {
	try {
		await rmdir(path);
	} catch {
		break;
	}
}

console.log(`Moved ${from} to ${to}`);
