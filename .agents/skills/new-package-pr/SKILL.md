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

A new package needs three things: a manifest set, a shard so it keeps updating itself, and a
PR that fills the template. Generate the manifests with komac rather than writing YAML by hand.

## Manifests — use komac

komac is the Anthelion fork, [unpn-org/Komac](https://github.com/unpn-org/Komac/releases).
Grab the binary for this machine; assets are named
`komac-{version}-{rust-target}` (`.exe` on Windows, `.tar.zst` elsewhere), e.g.
`komac-0.0.63-x86_64-unknown-linux-musl.tar.zst`.

```sh
export GITHUB_TOKEN=...          # classic PAT, public_repo scope
export KOMAC_GITHUB_OWNER=pl4nty KOMAC_GITHUB_REPO=winget-extras

komac new <PackageIdentifier> --version <Version> --urls <url>... \
  --dry-run --output manifests \
  --non-interactive '{"PackageLocale":"en-US","Publisher":"...","PackageName":"...","License":"...","ShortDescription":"..."}'
```

`--dry-run --output` writes the manifest set locally without opening a PR. The
`--non-interactive` JSON carries only the locale fields (`Publisher`, `PackageName`, `License`,
`Tags`, `ReleaseNotes`, …); the identifier, version, and URLs are flags. `komac new --help`
lists the rest — `--resolves` links the requesting issue, `--font` looks under `fonts/`.

**In a Claude Code web session `komac new` fails**: it uses the GitHub GraphQL API, which the
session proxy blocks (`403`, "only the pinned set of PR-review operations is served"). Nothing
in komac works around it. `komac analyse <file>` needs no network and still emits the installer
manifest fields — architecture, installer and nested-installer type, nested file paths,
`InstallerSha256`:

```sh
curl -fsSLO <installer-url> && komac analyse <file>
```

Take those fields, then write the three manifests by hand, copying the shape of a recent
package under `manifests/`. Say plainly in the PR that komac could not generate them.

## Shards

Every package needs one, or `repository/shard-coverage` warns and CI fails on
`--deny-warnings`. Format, strategies, and the order to prefer them are in Anthelion's
[CONTRIBUTING.md](https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md); its
[AGENTS.md](https://github.com/UnownPlain/anthelion/blob/main/AGENTS.md) covers the commands.
Read those rather than guessing the schema. One local difference: script shards here import
`anthelion`, `anthelion/github`, `anthelion/helpers`, not the `@/...` paths the guide shows —
copy an existing file in `shards/script/`.

Reviewers push back on skipping a shard, and have answered "impossible" with a working URL, so
look for the endpoint upstream does not advertise: `.appinstaller`, a Sparkle appcast, an
Electron `latest.yml`, a Tauri updater JSON, a versions page, or an `etag` on a stable URL
paired with `version: {source: product}`. Only when nothing works, add an entry to
`ignore["repository/shard-coverage"]` in `scripts/manifest-linter/config.json`, keyed on the
package directory, with a reason naming the mechanism that blocks it.

## Validate

```sh
bun fmt
bun lint --deny-warnings
bun manifests:check --deny-warnings   # bun manifests:fix applies what it can
bun test:manifests --deny-warnings
bun test:shard <PackageIdentifier> --dry-run
```

`bun ci` may fail in a sandbox: `anthelion` resolves to
`github:UnownPlain/anthelion-external`, which a repo-scoped token cannot fetch. Run whichever
checks you can and say which you skipped. `winget validate` and `winget install` need Windows;
don't claim them.

## PR

Title and commit subject:

```
New package: <PackageIdentifier> version <PackageVersion>
```

Fill `.github/PULL_REQUEST_TEMPLATE.md` and stop there. Tick only boxes that are true, link the
related `microsoft/winget-pkgs` issue or PR on the first line, and close the requesting issue
with `Fixes #<n>`. Add a sentence or two below the template only for a decision a reviewer
would otherwise query — an unusual installer type, a missing architecture, an absent shard.
Keep the diff to the manifests, the shard or config entry, and any `version-state/` seed.

Then watch CI and drive it to green. `Validate` sandbox-installs each changed installer and is
what catches real installer problems.
