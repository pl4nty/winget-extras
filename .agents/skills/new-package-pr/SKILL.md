---
name: new-package-pr
description: >-
  Add a package or font to pl4nty/winget-extras and open the "New package" pull request for it.
  Covers the manifests, the Anthelion shard, and the PR.
---

# New package PRs

## 1. Get komac

Download https://github.com/devicie/Komac-anthelion/releases/download/v0.0.66/komac-0.0.66-x86_64-unknown-linux-musl.tar.zst and put `komac`
on `PATH`. Extract with `tar --zstd -xf`, installing `zstd` from your system
package manager if it is missing.

## 2. Find every installer

Find every Windows installer for the version (all architectures, scopes, etc), and pass them all in one `--urls`, so a
single manifest carries every installer.

For fonts, prefer the designer's or foundry's own versioned download and use their identifier.
Use `Google.<Family>` only when the font is served from the `googlefonts` or `notofonts` GitHub
orgs, with `Publisher: Google Fonts` and the designers from the family's `METADATA.pb` in
google/fonts as `Author`. Don't add a family that is already packaged from another source.

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

Prefer matching the locale `Publisher`/`PackageName` to the ARP `Publisher`/`DisplayName` and
dropping the redundant `AppsAndFeaturesEntries` field, unless the ARP value is a worse name for
users - a bare domain, an abbreviation, an OEM, or a string that carries the version.

Both notes below apply to Anthropic's hosted cloud environments (Claude Code on the web);
elsewhere komac needs neither. `GITHUB_TOKEN` must be unset because a token selects an
authenticated path that needs GraphQL, which those environments block. And komac downloads
every `--urls` entry to hash it: `releases/download/...` resolves for any public repo, but
`/archive/*.zip`, `raw.githubusercontent.com` and the GitHub API return `403` for repos outside
the session's scope, and `add_repo` does not change that. Prefer a release asset. If the
installer can't be downloaded, stop - never invent a hash.

Try silent install first. Don't set `InstallModes: [interactive]` on a guess, or because
winget-pkgs validation failed or labelled the installer interactive-only: this repo's CI runs
differently. Identify the framework (Inno, NSIS, InstallShield, WiX/Burn, Qt IFW, InstallBuilder,
Squirrel, vendor self-extractor) and find its silent switches from its docs, `strings` and
`strings -el` on the binary or its embedded ini, and sibling packages here and in winget-pkgs.
Push them and read the Validate log and the screenshot comment on the PR. Fall back to
interactive only when CI shows a prompt or gate no switch skips, and put the framework, the
switches tried and what CI showed in the PR body.

## 4. Add a shard

`shards/json/<PackageIdentifier>.json`, or `shards/script/<PackageIdentifier>.ts` if JSON
can't express it; append `.Font` for fonts. Its `urls` must list every installer the manifest
carries, or the next version bump drops the ones it omits. Leave each URL bare - komac detects
the architecture, so add an `architecture` override only when a dry run gets it wrong. Schema
and strategies: [Anthelion CONTRIBUTING.md](https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md). Script shards import
`anthelion`, `anthelion/github`, `anthelion/helpers` - copy an existing `shards/script/` file.
Shared shard code lives in `scripts/shards-lib/`. Name a helper for one package family after its
ID prefix (`Microsoft.ConfigMgr.ts`, `Dell.ts`); general helpers keep a lowercase name (`mirror.ts`).
Use `mirror()` / `mirrorFile()` from `mirror.ts` when the vendor file can't be an InstallerUrl
(signed or extension-less URLs, archives winget can't open).

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
reply to a review - put anything a reviewer needs into the PR body instead, concisely.
