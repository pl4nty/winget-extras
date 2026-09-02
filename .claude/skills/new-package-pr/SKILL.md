---
name: new-package-pr
description: >-
  Add a package to pl4nty/winget-extras and open the "New package" pull request for it —
  manifest set, automated-update shard, local validation, and the PR body maintainers expect.
  Use this whenever work touches this repo's manifests/, fonts/, shards/, or version-state/
  directories: adding a new package or font, responding to a "[Package Request]" issue, porting
  a package winget-pkgs rejected, writing or fixing an Anthelion shard, or fixing CI on a
  new-package PR. Trigger it even when the request is phrased casually ("add Foo to my winget
  source", "someone asked for this app in an issue", "make a manifest for this installer URL")
  and even when the user names only an installer URL or a winget-pkgs issue.
---

# New package PRs for winget-extras

This repo is a custom WinGet source for packages that don't fit `microsoft/winget-pkgs`
(interactive-only installers, third-party download links, false-positive malware detections,
hardware-gated packages, fonts). A "New package" PR adds three things, and reviewers read them
in this order:

1. A **manifest set** under `manifests/` (or `fonts/`) — must be correct and honest.
2. An **Anthelion shard** under `shards/` so the package updates itself afterwards.
3. A **PR body** that says what you verified, what you could not verify, and why.

Skipping (2) is the single most common thing maintainers push back on. Treat "no shard" as a
claim you have to defend, not a default.

## Authoritative external docs

Shard format, strategy selection, regex discipline, release notes, and state are all defined
upstream. Read them before writing a shard — do not guess the schema:

- <https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md> — the shard guide
- <https://github.com/UnownPlain/anthelion/blob/main/AGENTS.md> — agent-facing commands

Two deltas apply when you write a shard *here* rather than in the Anthelion repo:

- Script shards import from the published package (`anthelion`, `anthelion/github`,
  `anthelion/helpers`), not the `@/...` paths shown in the upstream guide. Copy the import
  style from an existing file in `shards/script/`.
- Anthelion's AI policy ("autonomous agents may not contribute", "PR descriptions must be
  human-written") governs contributions to *the Anthelion repo*. It does not govern
  winget-extras, whose history is full of AI-assisted PRs with a Claude Code footer. If a
  change ends up targeting Anthelion itself, that policy applies and a human must own the
  prose.

## Step 1 — Establish scope before touching files

Cheap checks that prevent most wasted work:

- Does the package already exist? `ls manifests/<first-letter>/<Publisher>/<Package>` (fonts
  live under `fonts/`). A new *version* of an existing package is a different, smaller change.
- Is there an open PR for it already? The PR template asks; check `state:open` PRs.
- What does upstream say? Find the related `microsoft/winget-pkgs` issue or PR. It usually
  exists, and its identifier and manifest content are worth matching so the two stay aligned.
  If the package was rejected upstream, say which label or reason — that is the justification
  for it living here.
- Is there a requesting issue in this repo? Link it with `Closes #N`.

Whether a package belongs here at all is a judgement call about installer type. The
`package_request.yml` issue template lists what WinGet can install: standalone MSIX/APPX/MSI/EXE,
portable EXE, or either inside a ZIP. Scripts, `.tar`, `.gz`, `.7z`, `.rar` are out.

## Step 2 — Verify the installer yourself

Every field in the installer manifest is a factual claim. Derive them from the file, not from
the issue text or an upstream PR — history shows contributors re-downloading and recomputing
even when a hash was already quoted, and it is the cheapest way to be credibly right.

- `InstallerSha256`: `curl -L -o pkg.exe <url> && sha256sum pkg.exe` (uppercase in manifests).
- `PackageVersion` / `ProductCode` / `UpgradeCode`: read the installer's own metadata —
  `msiinfo export pkg.msi Property` (msitools) for MSI, `pefile`/`exiftool` for PE
  `ProductVersion`, `AppxManifest.xml` for MSIX. Quote what you found in the PR body.
- `ReleaseDate`: the GitHub release date, or the server's `Last-Modified` header
  (`curl -sI <url>`) for a vendor-hosted file.
- Confirm the version is still current upstream. A manifest for a superseded version invites a
  rewrite.

If two architectures resolve to a byte-identical installer, ship one entry, not two — a
reviewer has asked for exactly that before (an arm64 MSIX bundling the same nested MSI as x64).

## Step 3 — Write the manifest set

Read `references/manifests.md` for the field-by-field rules, the lint rules that will fail you,
and the schema-version choice. The short version: three files (`.yaml`, `.installer.yaml`,
`.locale.<locale>.yaml`) in
`manifests/<lowercase-first-letter>/<Publisher>/<Package>/<Version>/`, filenames derived from
`PackageIdentifier`, schema header string matching `ManifestVersion` exactly, UTF-8 without BOM,
mode 0644.

## Step 4 — Write the shard (default), or justify its absence (exception)

Read `references/shards.md`. Work the strategy preference order from Anthelion's CONTRIBUTING.md
top-down and pick the most specific one that fits — a declarative JSON shard beats a script
shard even when it is longer.

Before concluding that no shard is possible, look for the endpoints vendors expose but don't
advertise: `.appinstaller` files, Sparkle/WinSparkle appcast XML, Electron `latest.yml`, Tauri
updater JSON, ToDesktop `td-latest.json`, a `versions.html` page, an unversioned URL whose
`etag` can drive `state` with `version: {source: product}`. Maintainers have replied to
"no shard is possible" with a working URL more than once.

When it genuinely isn't possible, add an entry to the `repository/shard-coverage` ignore map in
`scripts/manifest-linter/config.json` with a reason that names the *mechanism*, not just the
outcome — the existing entries read like `"asrock.com blocks automated requests, and the
download URL is the only place the version appears"` or `"komac can't update msix treated as a
zip"`. Keep the map alphabetically ordered, matching its neighbours. Then explain the same
thing in the PR body, because that ignore entry is what a reviewer will question.

## Step 5 — Validate locally

```sh
bun ci                              # install; see the sandbox note below
bun fmt                             # oxfmt; --check in CI
bun lint --deny-warnings            # oxlint, type-aware
bun manifests:check --deny-warnings # this repo's manifest linter (also: manifests:fix)
bun test:manifests --deny-warnings  # linter unit tests
bun test:shard <PackageIdentifier> --dry-run   # only if you added a shard
```

`bun test:shard` is what CI's `Test` job runs on changed shards, and it catches shards that
parse but can't actually resolve a version. Run it before pushing when you can.

**Sandbox note.** `package.json` depends on `anthelion` via
`github:UnownPlain/anthelion-external#<sha>`. Sessions scoped to `pl4nty/winget-extras` often
cannot fetch it, so `bun ci` fails and `test:shard` is unavailable. The established workaround
is to swap that dependency locally for its published pieces (`@unownplain/anthelion-komac` and
the transitive deps), run the checks that don't need Anthelion itself, then **restore
`package.json` and `bun.lock` before committing** — they must never appear in the diff. Say
plainly in the PR body which checks you ran under the substitution and that `test:shard` was
not exercised end-to-end.

There is also no Windows environment here, so `winget validate --manifest` and
`winget install --manifest` cannot be run. Don't claim them. Report the repo-tooling checks you
actually ran instead; that substitution has been accepted repeatedly.

## Step 6 — Commit, push, open the PR

Title and commit subject use the repo's exact convention — the merge queue and history depend
on it:

```
New package: <PackageIdentifier> version <PackageVersion>
```

Keep the diff to the manifest set, the shard or config entry, and any `version-state/` seed.
Nothing else. Then write the PR body from `references/pr-body.md`, which carries the checklist
template plus worked examples of the narrative maintainers respond well to.

## Step 7 — Own the PR until it's green

CI runs `Lint Project`, `Test` (changed shards), `Lint Actions`, and `Validate` (sandbox-installs
each changed installer on Windows runners). `Validate` is the one that finds real installer
problems — silent-install failures, wrong architecture, wrong nested installer path.

Read the failing job's log, fix the cause, and push. Two failures worth recognising:

- `Test` failing on a `static` shard whose `version.source` is `display`/`product`/`file`
  means the installer has no PE version resource to read (an MSI, for instance). That shard
  cannot work; either find another strategy or move to a documented ignore entry.
- `Validate` cancelling sibling matrix jobs means two installer entries collapse to the same
  (architecture, scope, effective installer type) tuple. Deduplicate the installers rather than
  patching the shared workflow.

## Attribution

Commit trailer:

```
Co-Authored-By: Claude <noreply@anthropic.com>
```

PR body footer: the Claude Code line the harness specifies. Both are normal in this repo's
history; there is no need to hide the assistance, and describing it accurately is part of
letting a human stay in the loop.
