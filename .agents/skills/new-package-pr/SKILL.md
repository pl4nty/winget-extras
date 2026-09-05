---
name: new-package-pr
description: >-
  Add a package to pl4nty/winget-extras and open the "New package" pull request for it.
  Use whenever work touches this repo's manifests/, fonts/, shards/, or version-state/
  directories: adding a package or font, responding to a "[Package Request]" issue, porting a
  package winget-pkgs rejected, writing or fixing an Anthelion shard, or fixing CI on a
  new-package PR. Trigger it on casual phrasings too ("add Foo to my winget source", "someone
  asked for this app in an issue", "make a manifest for this installer URL"), and when the
  request names only an installer URL or a winget-pkgs issue.
---

# New package PRs

## 1. Get komac

```sh
V=0.0.65; T=x86_64-unknown-linux-musl   # .exe instead of .tar.zst on Windows
curl -fsSLO "https://github.com/devicie/Komac-anthelion/releases/download/v$V/komac-$V-$T.tar.zst"
export A="komac-$V-$T.tar.zst"; tar --zstd -xf "$A" && chmod +x komac
```

No `zstd` binary:

```sh
pip install -q zstandard && python3 -c "
import tarfile, io, zstandard, os
raw = zstandard.ZstdDecompressor().stream_reader(open(os.environ['A'],'rb')).read()
tarfile.open(fileobj=io.BytesIO(raw)).extractall()"
```

## 2. Generate manifests

From the repo root:

```sh
export KOMAC_GITHUB_OWNER=pl4nty KOMAC_GITHUB_REPO=winget-extras

env -u GITHUB_TOKEN ./komac new <PackageIdentifier> --version <Version> --urls <url>... \
  --non-interactive --dry-run --skip-pr-check --output . \
  --package-locale en-US --publisher '...' --package-name '...' \
  --license '...' --short-description '...'
```

`komac new --help` for the remaining locale flags, `--resolves <issue>`, `--font`, `--files`.
Leave the CRLF line endings komac writes.

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
bun lint --deny-warnings
bun manifests:check --deny-warnings   # manifests:fix applies what it can
bun test:manifests --deny-warnings
bun test:shard <PackageIdentifier> --dry-run
```

## 5. PR

Title and commit subject: `New package: <PackageIdentifier> version <PackageVersion>`

Fill `.github/PULL_REQUEST_TEMPLATE.md`, ticking only boxes you actually did. Link the related
`microsoft/winget-pkgs` issue or PR, and close the request with `Fixes #<n>`. Add prose only
for a decision a reviewer would query. Keep the diff to manifests, shard or config entry, and
any `version-state/` seed. Then drive CI to green.
