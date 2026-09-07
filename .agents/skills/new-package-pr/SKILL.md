---
name: new-package-pr
description: >-
  Add a package or font to pl4nty/winget-extras and open the "New package" pull request for it.
  Covers the manifests, the Anthelion shard, and the PR.
---

# New package PRs

## 1. Get komac

Download the latest release for your platform from
[devicie/Komac-anthelion](https://github.com/devicie/Komac-anthelion/releases) and put `komac`
on `PATH`. Extract a `.tar.zst` asset with `tar --zstd -xf`, installing `zstd` from your system
package manager if it is missing.

## 2. Find every installer

A request gives one URL; it is a starting point, not the set. Before generating anything, work
out every Windows installer the vendor ships for that version — each architecture (`x64`,
`arm64`, `x86`) and each scope (machine and user) — and pass them all in one `--urls`, so a
single manifest carries every installer. Shipping only the requested URL silently leaves those
users unable to install.

The GitHub API and a release's HTML asset list are both `403` for repos outside the session's
scope, so enumerate by probing instead: `curl -sSL -o /dev/null -w '%{http_code}' -r 0-0 <url>`
returns `206` for an asset that exists and `404` for one that doesn't. Vary the architecture
token in the filename you were given. For an electron-builder app, `latest.yml` and
`latest-arm64.yml` sit beside the installers and name every file with its size and sha512 —
fetch them and check the sha512 of what you downloaded against them.

Take the architecture from the filename and the vendor's own metadata, never from the outer
installer stub: electron-builder's NSIS stub is 32-bit x86 for every build, so `komac analyze`
reports `x86` for an arm64 asset. Record `Scope` and `ElevationRequirement` when the evidence is
there — `isAdminRightsRequired: true` in `latest*.yml`, or `requestedExecutionLevel` in the
stub's PE manifest, means `Scope: machine` and `ElevationRequirement: elevationRequired`.

## 3. Generate manifests

From the repo root:

```sh
export KOMAC_GITHUB_OWNER=pl4nty KOMAC_GITHUB_REPO=winget-extras

env -u GITHUB_TOKEN ./komac new <PackageIdentifier> --version <Version> --urls <url>... \
  --non-interactive --dry-run --skip-pr-check --output . \
  --package-locale en-US --publisher '...' --package-name '...' \
  --license '...' --short-description '...'
```

`komac new --help` for the remaining locale flags, `--font` and `--files`. Leave the CRLF line
endings komac writes.

Both notes below apply to Anthropic's hosted cloud environments (Claude Code on the web);
elsewhere komac needs neither. `GITHUB_TOKEN` must be unset because a token selects an
authenticated path that needs GraphQL, which those environments block. And komac downloads
every `--urls` entry to hash it: `releases/download/...` resolves for any public repo, but
`/archive/*.zip`, `raw.githubusercontent.com` and the GitHub API return `403` for repos outside
the session's scope, and `add_repo` does not change that. Prefer a release asset. If the
installer can't be downloaded, stop — never invent a hash.

## 4. Add a shard

`shards/json/<PackageIdentifier>.json`, or `shards/script/<PackageIdentifier>.ts` if JSON
can't express it; append `.Font` for fonts. Its `urls` must list every installer the manifest
carries, or the next version bump drops the ones it omits. Schema and strategies:
[Anthelion CONTRIBUTING.md](https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md),
[AGENTS.md](https://github.com/UnownPlain/anthelion/blob/main/AGENTS.md). Script shards import
`anthelion`, `anthelion/github`, `anthelion/helpers` — copy an existing `shards/script/` file.

Only if no strategy works, add the package directory to `ignore["repository/shard-coverage"]`
in `scripts/manifest-linter/config.json` with a reason.

## 5. Validate

```sh
bun fmt
bun manifests:check --deny-warnings
```

## 6. PR

Title and commit subject: `New package: <PackageIdentifier> version <PackageVersion>`

Fill `.github/PULL_REQUEST_TEMPLATE.md`, ticking only boxes you actually did. Link the related
`microsoft/winget-pkgs` issue or PR, and close the request with `Fixes #<n>`. Add prose only
for a decision a reviewer would query. Keep the diff to manifests, shard or config entry, and
any `version-state/` seed.

Then action CI failures and review comments until CI is green. Never comment on the PR or
reply to a review — put anything a reviewer needs into the PR body instead, concisely.
