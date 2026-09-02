# Shards

A shard tells Anthelion how to find the current version and installer URLs, so the package keeps
updating after your PR merges. Without one the package rots, which is why
`repository/shard-coverage` warns and why reviewers push back on ignore entries.

**Read <https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md> for the schema.** It
is the source of truth for every strategy, its options, templates, `state`, `replace`,
`versionRemove`, `nestedInstallerMatches`, release notes, and regex discipline. This file only
covers what is specific to winget-extras.

## Location and naming

```
shards/json/<PackageIdentifier>.json      # preferred
shards/script/<PackageIdentifier>.ts      # only when JSON cannot express it
shards/json/<PackageIdentifier>.Font.json # fonts append .Font
```

The filename minus extension must equal the identifier exactly, casing and punctuation included
— that is how `bun test:shard` and the coverage rule find it. A `.disabled` suffix parks a shard
without deleting it.

There are ~330 JSON shards and ~14 script shards. That ratio is the intended one.

## Choosing a strategy

Work Anthelion's preference order top-down and take the first that fits:

1. `electron-builder`, `tauri`, `todesktop`, `ms-download-center`, `json`, `yaml`
2. `github-release`
3. `github-commit`
4. `redirect-match`
5. `sourceforge`
6. `page-match`, `sort-versions`
7. `static`
8. script shard

The point of the order is robustness: a structured feed the vendor maintains breaks less often
than a regex over marketing HTML.

## Local examples worth copying

```jsonc
// shards/json/LZ4.LZ4.json — GitHub release with URL templates
{
	"$schema": "https://anthelion.unownplain.dev/schema.json",
	"strategy": "github-release",
	"github": { "owner": "lz4", "repo": "lz4" },
	"urls": [
		"https://github.com/lz4/lz4/releases/download/v{version}/lz4_win32_v{version|.|_}.zip",
		"https://github.com/lz4/lz4/releases/download/v{version}/lz4_win64_v{version|.|_}.zip",
	],
}
```

`{version|.|_}` rewrites `.` to `_` inside the placeholder — reach for that before writing a
script shard just to reshape a version string.

```jsonc
// shards/json/reaConverter.reaConverterLite.json — unversioned vendor URL
{
	"$schema": "https://anthelion.unownplain.dev/schema.json",
	"strategy": "static",
	"version": { "source": "product" },
	"urls": ["https://www.reaconverter.com/download/reaConverterLite-Setup.exe"],
	"state": {
		"source": "response-header",
		"url": "https://www.reaconverter.com/download/reaConverterLite-Setup.exe",
		"header": "etag",
	},
	"replace": true,
}
```

```ts
// shards/script/worproject.BootMounter.ts — note the import paths
import { defineShard } from 'anthelion';
import { getLatestRelease } from 'anthelion/github';
import { match } from 'anthelion/helpers';

export default defineShard(async () => {
	const release = await getLatestRelease({ owner: 'worproject', repo: 'dldserv-mirror' });
	const urls = release.urls().filter((url) => url.includes('WoR-Boot-Mounter_Release'));
	const {
		groups: [version],
	} = match(urls[0]!, /WoR-Boot-Mounter_Release_(\d+(?:\.\d+)+)\.zip$/i);
	return { version, urls: () => urls };
});
```

Anthelion's guide shows `@/github.ts` / `@/helpers` imports; in this repo use the published
`anthelion*` specifiers as above.

Reach for a script shard when a release bundles assets for several products and you must filter
the asset list, or when the tag needs conditional transformation. Not merely because the URL is
awkward.

## `static`, `state`, and `replace`

These three solve different problems and none implies another:

- `static` — no version lookup; komac derives the version from installer metadata
  (`display`, `product`, `file`, `fontVersion`). Only works on PE files with a version resource.
  **An MSI has no PE version resource**, so `static` + `product` cannot version an MSI-only
  package; CI's `Test` job will catch it.
- `state` — a cheap change token (usually an `etag`) so scheduled runs don't re-download an
  unchanged installer. Seed `version-state/<PackageIdentifier>` with the observed value _only_
  if the manifest you are adding already represents the current upstream build. If upstream is
  newer than what you are adding, leave the file absent — a matching state would suppress the
  very update the shard exists to make.
- `replace: true` — the previous latest version should not remain in the repo. Correct for
  rolling releases and reused installer URLs; wrong as a reflex for `static` shards whose old
  URLs still resolve.

## Before declaring "no shard is possible"

Maintainers have answered that claim with a working endpoint. Check for:

- an `.appinstaller` file next to an MSIX on the vendor CDN (always reflects current version)
- a Sparkle / WinSparkle appcast XML the app's own updater polls
- Electron `latest.yml`, Tauri updater JSON, ToDesktop `td-latest.json`
- a versions/changelog/release-notes page carrying the number even when the download URL doesn't
- a `HEAD` `etag` or `last-modified` on a stable URL, paired with `version: {source: product}`

Genuine blockers look like: the vendor bot-blocks automated requests _and_ the version appears
nowhere but the download URL; downloads are behind a login; signed URLs expire; the artifact is
an extension komac refuses to analyse; the installer is too large to download inside the update
timeout. Each of those has a precedent entry in
`scripts/manifest-linter/config.json` under `ignore["repository/shard-coverage"]`. Add yours
alphabetically, keyed on the package directory, with a reason that names the mechanism.

## Testing

```sh
bun test:shard <PackageIdentifier> --dry-run
bun test:shard <PackageIdentifier>.Font --dry-run   # fonts; either form works
```

`--dry-run` skips state writes and PR creation, and deliberately ignores stored state so the
shard still exercises. Never run it without `--dry-run` while developing — that can submit a
real PR. Never run `bun start`; it runs every shard.

CI's `Test` job derives package ids from the changed files under `shards/**` and runs exactly
this command, so a shard that fails locally will fail there.
