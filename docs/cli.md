# GitLurk CLI

The `gitlurk` command launches GitLurk Desktop and wraps common GitHub CLI (`gh`) and git config workflows.

## Install

From the monorepo root:

```bash
bun link
```

## Desktop launcher

```bash
gitlurk              # open cwd in GitLurk Desktop
gitlurk .            # same
gitlurk open <path>  # open a local repository
gitlurk clone <url>  # clone via desktop app
gitlurk url <repo> [branch]
```

## Global flags

```bash
gitlurk --help
gitlurk --version    # also prints gh version when installed
```

## GitHub CLI pairing

`gitlurk` requires [GitHub CLI](https://cli.github.com) for `gh` commands.

### Full passthrough

```bash
gitlurk gh run list
gitlurk gh repo view
gitlurk gh skill list
```

### Shortcuts

| Command                        | Equivalent          |
| ------------------------------ | ------------------- |
| `gitlurk runs`                 | `gh run list`       |
| `gitlurk watch [run-id]`       | `gh run watch`      |
| `gitlurk fork [repo]`          | `gh repo fork`      |
| `gitlurk repo edit ...`        | `gh repo edit`      |
| `gitlurk release create <tag>` | `gh release create` |
| `gitlurk alias ...`            | `gh alias`          |
| `gitlurk config ...`           | `gh config`         |
| `gitlurk skill ...`            | `gh skill`          |

Examples:

```bash
gitlurk runs --limit 5
gitlurk watch --exit-status
gitlurk fork involvex/gitlurk
gitlurk release create v0.1.2 --title "v0.1.2" --notes "Bug fixes"
gitlurk config set editor "code --wait"
gitlurk alias list
```

## Git config

```bash
gitlurk git config list --global
gitlurk git config get user.name --global
gitlurk git config set user.email "you@example.com" --global
gitlurk git config edit --global
```

Scopes: `--global`, `--local` (default), `--system`.

## Desktop Developer panel

Open **Settings → Developer** in GitLurk Desktop for:

- gh install/auth status
- gh config and aliases
- git config viewer (global/local/system)
- Quick actions: watch CI run, fork repo, create release

## Environment

| Variable                | Purpose                                          |
| ----------------------- | ------------------------------------------------ |
| `GITLURK_DESKTOP_EXE`   | Path to `gitlurk-desktop.exe`                    |
| `CARGO_TARGET_DIR`      | Cargo output directory for dev binary resolution |
| `EDITOR` / `GIT_EDITOR` | Editor for `gitlurk git config edit`             |
