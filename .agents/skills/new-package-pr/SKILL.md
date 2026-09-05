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

komac is the Anthelion fork. Take a binary from
[devicie/Komac-anthelion](https://github.com/devicie/Komac-anthelion/releases) — assets are
`komac-{version}-{rust-target}`, `.exe` on Windows and `.tar.zst` elsewhere, e.g.
`komac-0.0.65-x86_64-unknown-linux-musl.tar.zst`. `unpn-org/Komac` mirrors the same project
but lags: its newest publish is a v0.0.63 build predating the CLI rework, so it still wants
`--non-interactive '<json blob>'` and refuses to run a dry run without a token. Use devicie's
releases and the flags below.

```sh
export KOMAC_GITHUB_OWNER=pl4nty KOMAC_GITHUB_REPO=winget-extras

komac new <PackageIdentifier> --version <Version> --urls <url>... \
  --non-interactive --dry-run --skip-pr-check --output . \
  --package-locale en-US --publisher '...' --package-name '...' \
  --license '...' --short-description '...'
```

`--dry-run --output` writes the manifest set without opening a PR, under
`<output>/manifests/<l>/<Publisher>/<Package>/<Version>/`, so `--output .` lands it in the
right place in a checkout. Locale fields are individual flags — `komac new --help` lists them
all, plus `--resolves` to link the requesting issue, `--font` to look under `fonts/`, and
`--files` to analyse an already-downloaded installer instead of fetching the URL again.

komac derives the interesting fields itself: architecture, installer and nested installer type,
nested file paths, `ReleaseDate`, and `InstallerSha256`. It writes CRLF, which is what most of
this repo's manifests use — leave that alone.

**Unset `GITHUB_TOKEN` when running a dry run in a Claude Code web session.** komac looks up
existing manifests over the GitHub GraphQL API, and the session proxy rejects all GraphQL from
the container (`403`, "only the pinned set of PR-review operations is served"). That lookup
only pre-fills metadata, so the unauthenticated path treats the failure as a warning and
carries on — `Failed to retrieve values from GitHub without a token` followed by
`Successfully written all manifest files`. With a token the same 403 is fatal:

```sh
env -u GITHUB_TOKEN komac new ...
```

A token is still required to submit, which is not something to do from here anyway. Two
subcommands never touch the network and are useful on their own: `komac analyse <file>` prints
the installer fields for one file, and `komac format <dir>` rewrites manifests into komac's
canonical key order, installer order, and line endings.

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
