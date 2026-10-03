import { glob, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { parseArgs } from 'node:util';

// Maps microsoft/winget-pkgs packages to the update bots that maintain them.
// Each bot's own config is the source of truth; see maintained-packages/README.md.
// usage: bun maintained:map [--out <dir>] [--cache <dir>]
import { $ } from 'bun';

type Status = 'active' | 'check-only' | 'disabled';
type Entry = { id: string; source: string; status: Status; detail: string };

const SOURCES = {
	Dumplings: {
		repo: 'SpecterShell/Dumplings',
		sparse: ['/Tasks/*/Config.yaml', '/Tasks/*/Script.ps1'],
	},
	Anthelion: { repo: 'UnownPlain/anthelion', sparse: ['/shards/'] },
	'b0t-at': {
		repo: 'b0t-at/winget-pkgs-updates',
		sparse: [
			'/github-releases-monitored.yml',
			'/.github/workflows-data/',
			'/.github/workflows/update-script-packages.yml',
		],
	},
} as const;
type Source = keyof typeof SOURCES;

const RANK: Record<Status, number> = { active: 3, 'check-only': 2, disabled: 1 };

const { values: args } = parseArgs({
	options: {
		out: { type: 'string', default: 'maintained-packages' },
		cache: { type: 'string', default: join(tmpdir(), 'maintained-packages') },
	},
});

async function checkout(repo: string, dir: string, sparse?: readonly string[]) {
	await rm(dir, { recursive: true, force: true });
	await $`git clone --quiet --depth 1 --filter=blob:none --no-checkout https://github.com/${repo}.git ${dir}`;
	if (sparse) {
		await $`git -C ${dir} sparse-checkout set --no-cone ${sparse}`.quiet();
		await $`git -C ${dir} checkout --quiet`;
	}
	return (await $`git -C ${dir} rev-parse HEAD`.text()).trim();
}

const files = (cwd: string, pattern: string) => Array.fromAsync(glob(pattern, { cwd }));

async function dumplings(dir: string): Promise<Entry[]> {
	const entries: Entry[] = [];
	for (const config of await files(dir, 'Tasks/*/Config.yaml')) {
		const task = basename(dirname(config));
		const yaml = Bun.YAML.parse(await readFile(join(dir, config), 'utf8')) as Record<string, any>;
		const script = await readFile(join(dir, dirname(config), 'Script.ps1'), 'utf8').catch(() => '');
		// Tasks submit through Submit(), or CompleteInstallerUpdates() for installer-tracking tasks.
		const submits = /\$this\.(Submit|CompleteInstallerUpdates)\(/.test(script);
		const [status, detail]: [Status, string] = yaml.Skip
			? ['disabled', 'Skip: true']
			: yaml.CheckVersionOnly
				? ['check-only', 'CheckVersionOnly: true']
				: !submits
					? ['check-only', 'script never submits']
					: ['active', ''];
		const ids: string[] = [];
		if (yaml.WinGetIdentifier) ids.push(yaml.WinGetIdentifier);
		ids.push(...Object.values<string>(yaml.WinGetIdentifierModules ?? {}));
		for (const id of ids) {
			entries.push({
				id,
				source: 'Dumplings',
				status,
				detail: [`Tasks/${task}`, detail].filter(Boolean).join('; '),
			});
		}
		// Parent SimpleTasks (e.g. #Wondershare) only notify about the products they list.
		for (const product of Object.values<any>(yaml.Products ?? {})) {
			if (typeof product?.WinGetIdentifier !== 'string') continue;
			entries.push({
				id: product.WinGetIdentifier,
				source: 'Dumplings',
				status: yaml.Skip ? 'disabled' : 'check-only',
				detail: `Tasks/${task}; listed in SimpleTask Products`,
			});
		}
	}
	return entries;
}

async function anthelion(dir: string): Promise<Entry[]> {
	return (await files(dir, 'shards/{json,script}/*')).flatMap((path): Entry[] => {
		const name = basename(path);
		const disabled = name.endsWith('.disabled');
		const base = name.replace(/\.(json|ts|disabled)$/, '');
		if (!disabled && !/\.(json|ts)$/.test(name)) return [];
		// Font shards are named <id>.Font, matching Anthelion's getShardTarget()
		const id = base.endsWith('.Font') ? base.slice(0, -'.Font'.length) : base;
		return [{ id, source: 'Anthelion', status: disabled ? 'disabled' : 'active', detail: path }];
	});
}

async function b0t(dir: string): Promise<Entry[]> {
	const entries: Entry[] = [];
	// Workflows read the generated sidecar, not the yml, so the sidecar is what actually runs.
	const sidecars = join(dir, '.github/workflows-data');
	for (const sidecar of (await readdir(sidecars)).filter((name) =>
		name.endsWith('.packages.json'),
	)) {
		const packages = JSON.parse(await readFile(join(sidecars, sidecar), 'utf8')) as {
			id: string;
			repo: string;
		}[];
		for (const { id, repo } of packages) {
			entries.push({ id, source: 'b0t-at', status: 'active', detail: `GitHub release ${repo}` });
		}
	}
	// Retired entries are commented out, optionally after a "#  <id> is excluded: <reason>" note.
	const monitored = await readFile(join(dir, 'github-releases-monitored.yml'), 'utf8');
	const reasons = new Map(
		[...monitored.matchAll(/^#\s+(\S+) is excluded: (.*)$/gm)].map(([, id, reason]) => [
			id!,
			reason!,
		]),
	);
	for (const [, id, comment] of monitored.matchAll(/^#\s*- id: "([^"]+)"(?:\s*#\s*(.*))?$/gm)) {
		const reason = reasons.get(id!) ?? comment;
		entries.push({
			id: id!,
			source: 'b0t-at',
			status: 'disabled',
			detail: `commented out${reason ? `: ${reason}` : ''}`,
		});
	}
	const workflow = await readFile(
		join(dir, '.github/workflows/update-script-packages.yml'),
		'utf8',
	);
	for (const [, hash, id] of workflow.matchAll(/^(#?)\s*- PackageName: "([^"]+)"/gm)) {
		entries.push({
			id: id!,
			source: 'b0t-at',
			status: hash ? 'disabled' : 'active',
			detail: hash ? 'script package, commented out' : 'script package',
		});
	}
	return entries;
}

async function wingetPkgs(dir: string) {
	// Tree-only clone: the manifest paths are enough to list every package.
	const paths = (
		await $`git -C ${dir} -c core.quotePath=false ls-tree -r --name-only HEAD -- manifests fonts`.text()
	).split('\n');
	const ids = new Map<string, string>();
	for (const path of paths) {
		// <root>/<letter>/<id segments...>/<version>/<file>
		// Skips stray files such as .validation that sit outside a version directory.
		const segments = path.split('/');
		const id = segments.slice(2, -2).join('.');
		if (segments.length < 5 || !segments.at(-1)!.toLowerCase().startsWith(`${id.toLowerCase()}.`))
			continue;
		ids.set(id.toLowerCase(), id);
	}
	return ids;
}

const csv = (rows: (string | number | boolean)[][]) =>
	rows
		.map((row) =>
			row
				.map((cell) => (/[",\n]/.test(`${cell}`) ? `"${`${cell}`.replaceAll('"', '""')}"` : cell))
				.join(','),
		)
		.join('\n') + '\n';

await mkdir(args.cache, { recursive: true });
const commits: Record<string, string> = {};
const parsers: Record<Source, (dir: string) => Promise<Entry[]>> = {
	Dumplings: dumplings,
	Anthelion: anthelion,
	'b0t-at': b0t,
};

const [winget, ...bots] = await Promise.all([
	(async () => {
		const dir = join(args.cache, 'winget-pkgs');
		commits['microsoft/winget-pkgs'] = await checkout('microsoft/winget-pkgs', dir);
		return wingetPkgs(dir);
	})(),
	...(Object.keys(SOURCES) as Source[]).map(async (source) => {
		const { repo, sparse } = SOURCES[source];
		const dir = join(args.cache, source);
		commits[repo] = await checkout(repo, dir, sparse);
		return parsers[source](dir);
	}),
]);

// Keep one entry per (package, source): the strongest status wins.
const bySource = new Map<string, Entry>();
for (const entry of bots.flat()) {
	const key = `${entry.id.toLowerCase()}\0${entry.source}`;
	const existing = bySource.get(key);
	if (!existing || RANK[entry.status] > RANK[existing.status]) bySource.set(key, entry);
}
const entries = [...bySource.values()].sort(
	(a, b) =>
		a.id.toLowerCase().localeCompare(b.id.toLowerCase()) || a.source.localeCompare(b.source),
);

const sources = Object.keys(SOURCES) as Source[];
const packages = new Map<
	string,
	{ id: string; inWinget: boolean; status: Partial<Record<Source, Status>> }
>();
for (const [key, id] of winget) packages.set(key, { id, inWinget: true, status: {} });
for (const entry of entries) {
	const key = entry.id.toLowerCase();
	const pkg = packages.get(key) ?? { id: entry.id, inWinget: false, status: {} };
	pkg.status[entry.source as Source] = entry.status;
	packages.set(key, pkg);
}
const rows = [...packages.values()].sort((a, b) =>
	a.id.toLowerCase().localeCompare(b.id.toLowerCase()),
);
const activeCount = (pkg: (typeof rows)[number]) =>
	sources.filter((s) => pkg.status[s] === 'active').length;

await mkdir(args.out, { recursive: true });
await writeFile(
	join(args.out, 'packages.csv'),
	csv([
		['PackageIdentifier', 'InWingetPkgs', ...sources, 'ActiveMaintainers'],
		...rows.map((pkg) => [
			pkg.id,
			pkg.inWinget,
			...sources.map((s) => pkg.status[s] ?? ''),
			activeCount(pkg),
		]),
	]),
);
await writeFile(
	join(args.out, 'sources.csv'),
	csv([
		['PackageIdentifier', 'Source', 'Status', 'InWingetPkgs', 'Detail'],
		...entries.map((e) => [e.id, e.source, e.status, winget.has(e.id.toLowerCase()), e.detail]),
	]),
);

const inWinget = rows.filter((pkg) => pkg.inWinget);
const summary = {
	commits: Object.fromEntries(Object.entries(commits).sort()),
	wingetPkgs: {
		packages: inWinget.length,
		activelyMaintained: inWinget.filter((pkg) => activeCount(pkg) > 0).length,
		activeBySeveralBots: inWinget.filter((pkg) => activeCount(pkg) > 1).length,
	},
	sources: Object.fromEntries(
		sources.map((source) => {
			const own = entries.filter((e) => e.source === source);
			const count = (status: Status) => own.filter((e) => e.status === status).length;
			return [
				source,
				{
					repository: `https://github.com/${SOURCES[source].repo}`,
					active: count('active'),
					checkOnly: count('check-only'),
					disabled: count('disabled'),
					activeNotInWingetPkgs: own.filter(
						(e) => e.status === 'active' && !winget.has(e.id.toLowerCase()),
					).length,
				},
			];
		}),
	),
};
await writeFile(join(args.out, 'summary.json'), JSON.stringify(summary, null, '\t') + '\n');
console.log(JSON.stringify(summary, null, 2));
