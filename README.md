# WinGet Extras

A WinGet source for extra packages, especially ones that can't be added to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs). They might:

- [Use interactive-only installers](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Installer)
- [Need third-party download links](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Download)
- [Trigger false-positive malware detections](https://github.com/microsoft/winget-pkgs/issues?q=label%3ABinary-Validation-Error)
- [Require specific hardware to test](https://github.com/microsoft/winget-pkgs/issues?q=label%3A%22Hardware%22)
- [Be fonts](https://github.com/microsoft/winget-pkgs/issues?q=font%20sort%3Aupdated-desc)
- Or otherwise be easier to add here, than upstream

Packages are provided on a best-effort basis and may not be up-to-date. If you find a problem or want to add an app, [open an issue](https://github.com/pl4nty/winget-extras/issues/new/choose).

This repo was inspired by [ScoopInstaller/Extras](https://github.com/ScoopInstaller/Extras). Want to host your own custom source? Check out [pl4nty/winget-pkgs-selfhost](https://github.com/pl4nty/winget-pkgs-selfhost).

## Quickstart

With admin privileges, run:

```sh
winget source add --name winget-extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache
```

Extra packages will be available with commands like `winget search` or `winget install`.

If `winget update` throws `Failed to update source: winget-extras`, download and install https://winget.tplant.com.au/cache/source2.msix to force-refresh the cache.

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

## Adding packages

The easiest way to author or update a manifest is the Anthelion fork of Komac. Run `winget install unpn-org.Komac -s winget-extras` or download a binary for your platform from [unpn-org/Komac releases](https://github.com/unpn-org/Komac/releases/latest), then set these environment variables:

| Variable             | Value                                                        |
| -------------------- | ------------------------------------------------------------ |
| `GITHUB_TOKEN`       | A classic personal access token with the `public_repo` scope |
| `KOMAC_GITHUB_OWNER` | `pl4nty`                                                     |
| `KOMAC_GITHUB_REPO`  | `winget-extras`                                              |

```sh
# add a new package
komac new Publisher.Package

# update an existing package to a new version
komac update Publisher.Package --version 1.2.3 --urls https://example.com/setup-1.2.3.exe
```

### Automated updates

Add a shard at `shards/json/<PackageIdentifier>.json` describing how to detect new versions, and they'll be added automatically. Font shards append `.Font` to the identifier, like `shards/json/<PackageIdentifier>.Font.json`. See Anthelion's [CONTRIBUTING.md](https://github.com/UnownPlain/anthelion/blob/main/CONTRIBUTING.md) for the shard format, strategies for common sources, and how to test a shard locally with `bun test:shard <PackageIdentifier> --dry-run`.

### Validation

Packages are validated automatically using [GitHub Actions](https://github.com/pl4nty/winget-extras/blob/main/.github/workflows/validate.yml), or manually using `SandboxTest` from `winget-pkgs`. There are some limitations:

- Interactive installation is only tested if silent installation fails.
- The `arm` architecture (32-bit ARM) is not tested.
- If the package requires specific hardware, like NVIDIA graphics cards, the submitter should validate manually using a [local install](https://learn.microsoft.com/en-us/windows/package-manager/winget/install#local-install).

Try validation yourself with these commands.

```sh
git clone https://github.com/microsoft/winget-pkgs
cd winget-pkgs\Tools
.\SandboxTest.ps1 -Manifest ..\..\winget-extras\manifests\m\Microsoft\AzIPLogViewer\1.0\
```
