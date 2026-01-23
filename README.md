# Winget Extras

A winget source for packages that can't be added to [microsoft/winget-pkgs](https://github.com/microsoft/winget-pkgs).
They might use [interactive-only installers](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Installer),
[third-party download links](https://github.com/microsoft/winget-pkgs/issues?q=label%3AInteractive-Only-Download),
or [trigger false-positive malware detections](https://github.com/microsoft/winget-pkgs/issues?q=label%3ABinary-Validation-Error).

Packages are provided on a best-effort basis and may not be up-to-date. If you find a problem or want to add an app, [open an issue](https://github.com/pl4nty/winget-extras/issues/new).

## Quickstart

With admin privileges, run:

```sh
winget source add --name extras --type Microsoft.PreIndexed.Package --arg https://winget.tplant.com.au/cache
```

Extra packages will be available with commands like `winget search` or `winget install`.

## Validation

Packages are validated manually with `SandboxTest` from `winget-pkgs`, with some limitations.

* Interactive installation is only tested if silent installation fails
* Only x64 architecture is tested

Try it yourself with these commands.

```sh
git clone https://github.com/microsoft/winget-pkgs
cd Tools
.\SandboxTest.ps1 -Manifest ..\\..\\winget-extras\\manifests\\m\\Microsoft\\AzIPLogViewer\\1.0\\
```
