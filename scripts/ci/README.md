# CI scripts

Workflows call these scripts from the repository root:

- `validate/` contains the installer matrix, Windows setup and installation,
  desktop screenshots, Attack Surface Analyzer rules, summaries, and tests.
- `merge.ps1` merges manifests and resolves upstream dependencies for publishing.
- `actionlint-sarif.txt` is the actionlint SARIF output template.
- `validate/install-module.ps1` installs and imports PowerShell modules with retries.
- `validate/Logging.psm1` provides colored headings, results, warnings, and failures,
  plus timed phases with collapsible `Details` groups in GitHub Actions. Commands
  use a gray `$` prompt above their output group; completion stays inside. Set `NO_COLOR`
  for plain output. Warnings and failures also produce workflow annotations.
  Detail lines are indented only inside dropdowns. Installer exit codes use green
  success headings for zero and red error headings for nonzero codes.

`validate/Validation.psm1` provides the Windows setup, installer process, and
desktop operations, and log reporting. Workflow steps import it by path; its
screenshot and desktop helpers are private. Importing it does not run setup.

`validate/Correlation.psm1` uses Microsoft's pinned WinGet utility package to
collect installer metadata before and after installation. Validation waits five
seconds after installation before collecting metadata, allowing delayed ARP entries
to appear. It checks the correlated
ARP entry against one complete `AppsAndFeaturesEntries` item, falling back to the
selected installer's product code, scope, and effective installer type (including
nested archive types), and the package name, publisher, and version.
Installer entries replace root entries; the installer locale selects localized
defaults. Name and publisher comparisons use WinGet's canonical values, obtained
through its index API. Normalized matches pass and display the canonical value.
Product codes display verbatim from the collector and compare using WinGet's case
folding; braces, hyphens, and whitespace remain significant. For other fields, case
and surrounding whitespace differences count as exact matches. Scopes display in
lowercase, and equivalent `wix`/`msi` ARP types match without an extra normalized value.
Only WinGet name and publisher normalization
uses the normalized match label. Explicit ARP versions may differ
from `PackageVersion`. `UpgradeCode` is not exposed by the collector and is not checked.
MSIX installers check their registered package family instead; fonts skip ARP checks.
This validates installation correlation and metadata; catalog resolution through
`winget list` would require a source containing the manifest under test.

The matrix script uses PowerShell and `yq`; it does not need `powershell-yaml`.
It reads `PACKAGE_ID` and `VERSION` for manual selection, or `CHANGED` as a JSON
array of changed package directories. It emits one entry per manifest path,
architecture, scope, and installer type, with the package ID and version for compact
job names. Output goes to `GITHUB_OUTPUT` when set,
otherwise stdout:

```powershell
./scripts/ci/validate/matrix.ps1 -PackageId Microsoft.AzIPLogViewer -Version 1.0 -OutputPath ''
```

Windows installation uses `powershell-yaml` and saves logs, screenshots, and SARIF
reports under `RUNNER_TEMP/artifacts`.
Correlation JSON and its diagnostic log are also uploaded as a metadata artifact.
The job summary includes a comparison table with manifest, installed, and normalized
values and distinguishes exact matches, normalized matches, and mismatches. Failed
and skipped correlation checks also write their results before exiting.
The validation script prints installer and WinGet logs in dropdowns named after each
log. Console logs longer than 50 lines also get a tail preview alongside the full log.
The job summary contains each full log once, including when validation fails.

Run the regression checks with `pwsh -NoProfile -File scripts/ci/validate/tests/run.ps1`.
They require PowerShell and `yq`, and install `powershell-yaml` if needed for the
Windows script's selection and reporting tests. No apps are installed by the tests.
