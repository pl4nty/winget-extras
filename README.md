# Winget Extras

A winget source for packages that can't be added to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs). They might:

* [Use interactive-only installers](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Installer)
* [Need third-party download links](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Download)
* [Trigger false-positive malware detections](https://github.com/microsoft/winget-pkgs/issues?q=label%3ABinary-Validation-Error)
* [Require specific hardware to test](https://github.com/microsoft/winget-pkgs/issues?q=label%3A%22Hardware%22)

Packages are provided on a best-effort basis and may not be up-to-date. If you find a problem or want to add an app, [open an issue](https://github.com/pl4nty/winget-extras/issues/new/choose).

## Quickstart

With admin privileges, run:

```sh
winget source add --name extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache
```

Extra packages will be available with commands like `winget search` or `winget install`.

## Maintenance

### Code signing

Packages are signed via [AzureSignTool](https://github.com/vcsjones/AzureSignTool) using a certificate stored in Azure Key Vault. The following GitHub secrets must be configured:

| Secret | Description |
|--------|-------------|
| `AZURE_CLIENT_ID` | App registration client ID for OIDC |
| `AZURE_TENANT_ID` | Azure AD tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Azure subscription ID |
| `KEY_VAULT_URL` | Key Vault URL, e.g. `https://kv-name.vault.azure.net` |
| `KEY_VAULT_CERT` | Certificate name within the Key Vault |

The app registration needs a federated credential for `repo:pl4nty/winget-extras:*` and the `Key Vault Certificate User` role on the Key Vault.

The `Publisher` field in [`index/AppxManifest.xml`](index/AppxManifest.xml) must exactly match the signing certificate's Subject. Update it if the certificate subject changes.

### Updating IndexCreationTool

The publish workflow uses `IndexCreationTool.exe` from [pl4nty/winget-pkgs-selfhost](https://github.com/pl4nty/winget-pkgs-selfhost/releases/latest) to build the source index. When a new winget-cli version is released (especially one with source creator changes), update the binary:

1. Find the corresponding build at [shine-oss/winget-cli on Azure Pipelines](https://dev.azure.com/shine-oss/winget-cli/_build). For example, v1.29.240 used build [#329596](https://dev.azure.com/shine-oss/winget-cli/_build/results?buildId=329596&view=artifacts&pathAsName=false&type=publishedArtifacts).
2. Download the `Build.x64release` artifact.
3. Extract the `Build.x64release\AppInstallerCLIE2ETests\` folder from the archive.
4. Zip the contents of that folder as `AppInstallerCLIE2ETests.zip`.
5. Create a new release on [pl4nty/winget-pkgs-selfhost](https://github.com/pl4nty/winget-pkgs-selfhost) tagged with the winget-cli commit SHA, and upload the zip as a release asset.

The publish workflow always downloads from `releases/latest`, so it picks up the new binary automatically.

## Validation

Packages are validated automatically using [GitHub Actions](https://github.com/pl4nty/winget-extras/blob/main/.github/workflows/validate.yml), or manually using `SandboxTest` from `winget-pkgs`. There are some limitations:

* Interactive installation is only tested if silent installation fails
* The `arm` architecture (32-bit ARM) is not tested

Try validation yourself with these commands.

```sh
git clone https://github.com/microsoft/winget-pkgs
cd winget-pkgs\Tools
.\SandboxTest.ps1 -Manifest ..\..\winget-extras\manifests\m\Microsoft\AzIPLogViewer\1.0\
```
