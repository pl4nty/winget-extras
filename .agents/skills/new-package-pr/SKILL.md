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

## 2. Generate manifests

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

## 3. Add a shard

`shards/json/<PackageIdentifier>.json`, or `shards/script/<PackageIdentifier>.ts` if JSON
can't express it; append `.Font` for fonts. Schema and strategies:
[Anthelion CONTRIBUTING.md](https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md),
[AGENTS.md](https://github.com/UnownPlain/anthelion/blob/main/AGENTS.md). Script shards import
`anthelion`, `anthelion/github`, `anthelion/helpers` — copy an existing `shards/script/` file.

Only if no strategy works, add the package directory to `ignore["repository/shard-coverage"]`
in `scripts/manifest-linter/config.json` with a reason.

## 4. Validate

```sh
bun fmt
bun manifests:check --deny-warnings
```

## 5. PR

Title and commit subject: `New package: <PackageIdentifier> version <PackageVersion>`

Fill `.github/PULL_REQUEST_TEMPLATE.md`, ticking only boxes you actually did. Link the related
`microsoft/winget-pkgs` issue or PR, and close the request with `Fixes #<n>`. Add prose only
for a decision a reviewer would query. Keep the diff to manifests, shard or config entry, and
any `version-state/` seed.

Then action CI failures and review comments until CI is green. Never comment on the PR or
reply to a review — put anything a reviewer needs into the PR body instead, concisely.
