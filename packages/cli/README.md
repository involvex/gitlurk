# @involvex/gitlurk-desktop

CLI companion for [GitLurk Desktop](https://github.com/involvex/gitlurk).

## Install

```bash
npm install -g @involvex/gitlurk-desktop
# or
bun add -g @involvex/gitlurk-desktop
```

## Usage

```bash
gitlurk --help
gitlurk --version
gitlurk .                 # open cwd in GitLurk Desktop
gitlurk gh run list       # passthrough to GitHub CLI
gitlurk runs              # shortcut for gh run list
gitlurk git config list --global
gitlurk install-desktop   # download Windows installer from GitHub Releases
```

Requires [GitHub CLI](https://cli.github.com) for `gh` commands.

## Desktop app

The npm package installs the CLI. Install the Windows desktop app with:

```bash
gitlurk install-desktop
```

Or download the MSI/setup from [Releases](https://github.com/involvex/gitlurk/releases).

Set `GITLURK_DESKTOP_EXE` if the desktop binary is not on a standard path.
