# PR title and body

## Title

```
New package: <PackageIdentifier> version <PackageVersion>
```

Exactly that, for both the PR title and the squashed commit subject. Examples from history:
`New package: LZ4.LZ4 version 1.10.0`, `New package: ASRock.PolychromeRGB version 2.0.191`.

## Structure

Start from `.github/PULL_REQUEST_TEMPLATE.md` — keep its headings and checkboxes — then add a
narrative section under it. The template alone is not enough for a new package; every recent
merged one carries prose.

Tick a checkbox only if you actually did the thing. You cannot run `winget validate` or
`winget install` without Windows, so leave those unticked and explain the substitute below
instead of quietly claiming them. Fill the winget-pkgs line with the real issue or PR
(`microsoft/winget-pkgs#426292`), or say `N/A —` plus the reason none exists.

Then cover, in roughly this order:

1. **What the package is and who asked.** One or two sentences. `Closes #N` for the requesting
   issue.
2. **Why it belongs here** rather than winget-pkgs, when that isn't obvious — the upstream
   rejection reason, the dependency winget-pkgs won't accept, the interactive-only installer.
3. **Manifest decisions that aren't self-evident.** Installer type choices, why one architecture
   is absent, where `ProductCode`/`PackageFamilyName`/`SignatureSha256` came from, a license
   that has no exact SPDX id.
4. **Verification.** What you downloaded, what you computed, what tool you read metadata with,
   and the hashes. State plainly what you could *not* run and what you ran instead.
5. **Shard.** Which strategy and why that one; or, if there is no shard, the exact mechanism
   that blocks every strategy and the ignore entry you added.

## Tone

Specific and falsifiable beats confident. The bodies that sail through name commands, hashes,
headers, and tools:

> Re-downloaded the installer directly from `anbsoftware.co.uk` and computed SHA256 myself (did
> not trust the hash quoted in #1062) — matched exactly: `3A6C43…`. Extracted the MSI and
> verified its `ProductCode` (`{881F786E-…}`) with `msitools`' `msiinfo export`.

Flag things a reviewer should second-guess rather than burying them:

> Two things I ran into and fixed along the way, worth flagging for review: …

Say what you skipped and why:

> I could not install the real `anthelion` dependency in this sandbox, so
> `bun test:shard Tarma.InstallMate --dry-run` has not been exercised end-to-end — the shard is
> verified only against the strategy semantics in Anthelion's CONTRIBUTING.md and the closest
> existing shards in this repo.

When your PR overlaps someone else's, be explicit that theirs is untouched. Several merged PRs
re-do an earlier contributor's package to add a working shard and say so directly: *"This is a
separate submission that adds the shard piece that was missing. #1068 itself has not been
touched."*

## Worked example

```markdown
Checklist for Pull Requests

- [x] Is there a related issue or pull request in [winget-pkgs](https://github.com/microsoft/winget-pkgs)? If so, add the link(s) below.
  - Relates to microsoft/winget-pkgs#426292

Manifests

- [x] Have you checked that there aren't other open [pull requests](https://github.com/pl4nty/winget-extras/pulls) for the same manifest update/change?
- [ ] Have you [validated](https://github.com/microsoft/winget-pkgs/blob/master/doc/Authoring.md#validation) your manifest locally with `winget validate --manifest <path>`?
- [ ] Have you tested your manifest locally with `winget install --manifest <path>`?
- [x] Does your manifest conform to the [1.28 schema](https://github.com/denelon/winget-pkgs/tree/docs/manifest-schema-1.28.0/doc/manifest/schema/1.28.0)?

---

Adds a manifest for [LZ4](https://github.com/lz4/lz4), a lossless compression algorithm, in
response to #1116. Closes #1116.

The Windows build is distributed as a zip on GitHub releases containing a portable `lz4.exe`, so
this is packaged as `InstallerType: zip` / `NestedInstallerType: portable` (x64 and x86),
matching the existing `NirSoft.NirCmd` and `Git.PortableGit` manifests.

**Verification** — no Windows environment here, so `winget validate`/`winget install` could not
be run. Instead:

- Downloaded both release zips and recomputed SHA256 (`8CB562A5…`, `AB0CC315…`).
- `ReleaseDate` taken from the `v1.10.0` GitHub release.
- `bun manifests:check --deny-warnings`, `bun test:manifests --deny-warnings`, `bun fmt --check`
  all pass.

**Shard** — `shards/json/LZ4.LZ4.json`, `github-release`, with URL templates using
`{version|.|_}` for upstream's underscored filenames.
```

## Attribution

Commit trailer `Co-Authored-By: Claude <noreply@anthropic.com>`, and the Claude Code footer on
the PR body. Both are established here. Anthelion's own AI policy (no autonomous contributions,
human-written PR prose) applies to the Anthelion repo, not to winget-extras — but if a change
targets Anthelion, a human owns the prose there.
