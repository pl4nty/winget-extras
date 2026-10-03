# Maintained winget-pkgs packages

Which [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs) packages are kept up to date by an update bot. Regenerate with `bun maintained:map`; the commit of each source is recorded in `summary.json`.

- `packages.csv`: one row per package in winget-pkgs, plus bot packages missing from it, with each bot's status and the number of bots actively updating it.
- `sources.csv`: one row per package and bot, with where the status came from.
- `summary.json`: source commits and counts.

## Sources

Each bot's own configuration is the source of truth.

| Bot | Read from | `active` | `check-only` | `disabled` |
| --- | --- | --- | --- | --- |
| [Dumplings](https://github.com/SpecterShell/Dumplings) | `Tasks/*/Config.yaml` `WinGetIdentifier` and `WinGetIdentifierModules`, plus `Script.ps1` | Script calls `Submit()` or `CompleteInstallerUpdates()` | `CheckVersionOnly: true`, a script that never submits, or a product listed by a parent `SimpleTask` | `Skip: true` |
| [Anthelion](https://github.com/UnownPlain/anthelion) | `shards/{json,script}/<id>[.Font].{json,ts}` | Shard exists | | `.disabled` shard |
| [b0t-at](https://github.com/b0t-at/winget-pkgs-updates) | `.github/workflows-data/*.packages.json` (what its workflows run) and the `update-script-packages.yml` matrix | Listed | | Commented out in `github-releases-monitored.yml` or the matrix |

When a bot lists a package more than once, the strongest status wins (`active`, then `check-only`, then `disabled`). Identifiers match case-insensitively.

`InWingetPkgs: false` means the bot tracks a package that winget-pkgs does not have at that commit, such as a new package still in review or one that was removed.

This only covers these three bots. Packages updated by their publishers or other bots show no maintainer here.
