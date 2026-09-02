# Manifest authoring

## The set

A package version is exactly three files (more locales optional), all in one directory:

```
manifests/<l>/<Publisher>/<Package>/<Version>/
  <PackageIdentifier>.yaml                  # ManifestType: version
  <PackageIdentifier>.installer.yaml        # ManifestType: installer
  <PackageIdentifier>.locale.<locale>.yaml  # ManifestType: defaultLocale (+ locale for extras)
```

`<l>` is the lowercased first character of `PackageIdentifier`; the remaining path segments are
the identifier split on `.`. `Microsoft.Teams.MeetingAddin` 1.26.20101 →
`manifests/m/Microsoft/Teams/MeetingAddin/1.26.20101/`.

Font packages live under `fonts/` with the same shape. The split is enforced by installer type,
not by intent: any manifest whose effective installer type is `font` must be under `fonts/`, and
anything else under `manifests/`. A package cannot appear under both, and cannot mix font and
application installers.

## Schema version

`1.9.0`, `1.10.0`, `1.12.0`, and `1.28.0` are all accepted by the linter. Prefer **1.28.0** for
new packages: it is what the PR template's checklist asks for and what the most recent additions
use. Komac may emit an older version — bump it deliberately rather than by accident.

The first line must be exactly:

```
# yaml-language-server: $schema=https://aka.ms/winget-manifest.<ManifestType>.<ManifestVersion>.schema.json
```

`<ManifestType>` here is the manifest's own type (`version`, `installer`, `defaultLocale`,
`locale`), and it must agree with `ManifestVersion` in the same file. `bun manifests:fix` can
repair a mismatched header, but not a missing or duplicated one.

## Skeletons

Version manifest:

<!-- prettier-ignore -->
```yaml
# yaml-language-server: $schema=https://aka.ms/winget-manifest.version.1.28.0.schema.json

PackageIdentifier: Publisher.Package
PackageVersion: 1.2.3
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.28.0
```

Installer manifest — fields shared by every installer sit at the root, per-installer overrides
go in the list:

<!-- prettier-ignore -->
```yaml
# yaml-language-server: $schema=https://aka.ms/winget-manifest.installer.1.28.0.schema.json

PackageIdentifier: Publisher.Package
PackageVersion: 1.2.3
ReleaseDate: 2026-01-15
InstallerType: zip
NestedInstallerType: portable
NestedInstallerFiles:
- RelativeFilePath: tool.exe
  PortableCommandAlias: tool
UpgradeBehavior: install
Installers:
- Architecture: x64
  InstallerUrl: https://github.com/example/example/releases/download/v1.2.3/tool-x64.zip
  InstallerSha256: 8CB562A53189DFC8A53EC12469B91F1B51A5075036061A86B55738183BF4AB74
ManifestType: installer
ManifestVersion: 1.28.0
```

Default-locale manifest: `Publisher`, `PackageName`, `License`, `ShortDescription` are the
required core; `PublisherUrl`, `PublisherSupportUrl`, `PackageUrl`, `LicenseUrl`, `Description`,
`Moniker`, `Tags`, `ReleaseNotes`/`ReleaseNotesUrl` when upstream supplies them.

## Lint rules that will fail you

`bun manifests:check --deny-warnings` runs these; `--deny-warnings` is what CI uses, so
warnings are errors in practice.

| Rule                            | What it wants                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `file/encoding`                 | UTF-8, no BOM                                                                                                                                                                           |
| `file/mode`                     | `0644`                                                                                                                                                                                  |
| `repository/schema-header`      | header exactly matches type + version, exactly one header line                                                                                                                          |
| `repository/manifest-path`      | directory and filenames derived from identifier/version/locale                                                                                                                          |
| `repository/manifest-set`       | exactly one version and one installer manifest per directory; identifier and version identical across the set                                                                           |
| `repository/identifier-casing`  | one casing of an identifier repo-wide                                                                                                                                                   |
| `repository/package-kind`       | fonts under `fonts/`, applications under `manifests/`, never mixed                                                                                                                      |
| `repository/contents`           | no subdirectories or non-`.yaml` files inside a manifest directory                                                                                                                      |
| `repository/arp-version-ranges` | `DisplayVersion` ranges in `AppsAndFeaturesEntries` must not overlap between two versions of the same package                                                                           |
| `repository/shard-coverage`     | every package has a shard, or a reasoned ignore entry                                                                                                                                   |
| `repository/license-spdx`       | a real SPDX id, or a recognised localized word like `Proprietary` / `Freeware`                                                                                                          |
| `repository/copyright-format`   | `© Holder.` form — `bun manifests:fix` rewrites it                                                                                                                                      |
| `repository/upstream-versions`  | this exact version must not already exist in `microsoft/winget-pkgs`                                                                                                                    |
| `installer/metadata`            | no duplicate (type, architecture, locale, scope) installer; `ProductCode`/`AppsAndFeaturesEntries`/`PackageFamilyName` only on types that support them; one URL cannot carry two hashes |
| `installer/archive`             | `zip` needs `NestedInstallerType` + `NestedInstallerFiles`; only `portable`/`font` may list several; portable takes at most one command and no `Scope`                                  |
| `installer/return-codes`        | no return code repeated across success and expected codes                                                                                                                               |
| `installer/switches`            | MSI switch syntax; `TRANSFORMS`, `PATCH`, `MSINEWINSTANCE`, `ADMINPROPERTIES` are blocked                                                                                               |
| `installer/github-host`         | `github.com`, never `codeload.github.com` or `raw.githubusercontent.com`                                                                                                                |
| `installer/github-pinning`      | a pinned tag or commit, never a branch name                                                                                                                                             |

`oxfmt` deliberately ignores `manifests/**` and `fonts/**`, so manifest YAML keeps komac's
style — zero-indent sequence items, double-quoted strings — rather than the formatter's. Match
the surrounding files when hand-editing; `bun fmt` will not do it for you. It _does_ format
markdown elsewhere in the repo, including these skill files.

`repository/upstream-versions` is worth internalising: this repo exists for what winget-pkgs
_won't_ take. If the version is already published upstream, the package belongs there, not here.

## Untestable packages

When the package needs hardware or an environment nobody has, existing manifests disclose it in
the locale file rather than staying silent:

<!-- prettier-ignore -->
```yaml
Agreements:
- Agreement: "This package is untested, as no test environment was available. Please report any issues here: https://github.com/pl4nty/winget-extras/issues/new?template=package_issue.yml"
```

Use it for the genuinely untestable case, not as a blanket excuse for skipping validation you
could have run.
