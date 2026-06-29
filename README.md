# WinGet Extras

A WinGet source for extra packages, especially ones that can't be added to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs). They might:

- [Use interactive-only installers](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Installer)
- [Need third-party download links](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Download)
- [Trigger false-positive malware detections](https://github.com/microsoft/winget-pkgs/issues?q=label%3ABinary-Validation-Error)
- [Require specific hardware to test](https://github.com/microsoft/winget-pkgs/issues?q=label%3A%22Hardware%22)
- Or otherwise be easier to add here, than upstream

Packages are provided on a best-effort basis and may not be up-to-date. If you find a problem or want to add an app, [open an issue](https://github.com/pl4nty/winget-extras/issues/new/choose).

This repo was inspired by [ScoopInstaller/Extras](https://github.com/ScoopInstaller/Extras). Want to host your own custom source? Check out [pl4nty/winget-pkgs-selfhost](https://github.com/pl4nty/winget-pkgs-selfhost).

## Quickstart

With admin privileges, run:

```sh
winget source add --name winget-extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache
```

Extra packages will be available with commands like `winget search` or `winget install`.

## Enterprise deployment

The source can be deployed to managed devices via the [`EnableAdditionalSources`](https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-desktopappinstaller#enableadditionalsources) policy.

### Intune

In the Settings Catalog, enable **Administrative Templates > Windows Components > Desktop App Installer > Enable App Installer Additional Sources** and set the value to:

<!-- prettier-ignore -->
```json
{"Arg":"https://winget.tplant.com.au/cache","Data":"tplant.Winget.Source_ggk937h18f62r","Explicit":false,"Identifier":"tplant.Winget.Source_ggk937h18f62r","Name":"winget-extras","TrustLevel":["Trusted"],"Type":"Microsoft.PreIndexed.Package"}
```

### Group Policy

Enable **Computer Configuration > Administrative Templates > Windows Components > Desktop App Installer > Enable App Installer Additional Sources** and set the same value as above.

## Validation

Packages are validated automatically using [GitHub Actions](https://github.com/pl4nty/winget-extras/blob/main/.github/workflows/validate.yml), or manually using `SandboxTest` from `winget-pkgs`. There are some limitations:

- Interactive installation is only tested if silent installation fails
- The `arm` architecture (32-bit ARM) is not tested

Try validation yourself with these commands.

```sh
git clone https://github.com/microsoft/winget-pkgs
cd winget-pkgs\Tools
.\SandboxTest.ps1 -Manifest ..\..\winget-extras\manifests\m\Microsoft\AzIPLogViewer\1.0\
```
