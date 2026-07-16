# scripts/release.ps1
# Bumps workspace + Tauri versions, refreshes CHANGELOG, tags, and pushes
# (pushing v* tags triggers the Release Windows workflow).

$ErrorActionPreference = 'Stop'

Write-Host "GitLurk release (PowerShell)..."

# 1. Ensure clean git working directory
Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Error: Uncommitted changes detected. Commit or stash before releasing."
  Write-Host $gitStatus
  exit 1
}

function Get-SemverParts([string]$version) {
  $v = $version.TrimStart('v')
  $parts = $v.Split('.')
  if ($parts.Length -lt 3) {
    throw "Expected semver X.Y.Z, got: $version"
  }
  return @{
    Major = [int]$parts[0]
    Minor = [int]$parts[1]
    Patch = [int]$parts[2]
  }
}

function Bump-Patch([string]$version) {
  $p = Get-SemverParts $version
  return "$($p.Major).$($p.Minor).$($p.Patch + 1)"
}

# 2. Resolve current version from Tauri config (source of truth for the desktop app)
$tauriConfPath = 'packages/app/src-tauri/tauri.conf.json'
$tauriConf = Get-Content -Raw $tauriConfPath | ConvertFrom-Json
$current = [string]$tauriConf.version
$NEW_VERSION_NUM = Bump-Patch $current
$NEW_VERSION = "v$NEW_VERSION_NUM"
Write-Host "Bumping $current -> $NEW_VERSION_NUM"

# 3. Update version fields across the monorepo
Write-Host "Updating package / Tauri / Cargo versions..."

$packageJsonFiles = @(
  'package.json',
  'packages/app/package.json',
  'packages/shared/package.json',
  'packages/cli/package.json',
  'packages/git/package.json',
  'packages/plugin-sdk/package.json',
  'packages/extension/package.json',
  'packages/plugins/example-hello/package.json'
)

foreach ($file in $packageJsonFiles) {
  if (-not (Test-Path $file)) { continue }
  $json = Get-Content -Raw $file | ConvertFrom-Json
  $json | Add-Member -NotePropertyName version -NotePropertyValue $NEW_VERSION_NUM -Force
  $text = ($json | ConvertTo-Json -Depth 20) + "`n"
  [System.IO.File]::WriteAllText((Resolve-Path $file), $text)
  Write-Host "  $file -> $NEW_VERSION_NUM"
}

$tauriConf.version = $NEW_VERSION_NUM
$tauriText = ($tauriConf | ConvertTo-Json -Depth 20) + "`n"
[System.IO.File]::WriteAllText((Resolve-Path $tauriConfPath), $tauriText)
Write-Host "  $tauriConfPath -> $NEW_VERSION_NUM"

$cargoTomlPath = 'packages/app/src-tauri/Cargo.toml'
$cargoToml = Get-Content -Raw $cargoTomlPath
if ($cargoToml -notmatch '(?m)^version\s*=\s*"[^"]+"') {
  throw "Could not find version in $cargoTomlPath"
}
$cargoToml = [regex]::Replace(
  $cargoToml,
  '(?m)^version\s*=\s*"[^"]+"',
  "version = `"$NEW_VERSION_NUM`"",
  1
)
[System.IO.File]::WriteAllText((Resolve-Path $cargoTomlPath), $cargoToml)
Write-Host "  $cargoTomlPath -> $NEW_VERSION_NUM"

# 4. Generate CHANGELOG.md
Write-Host "Generating CHANGELOG.md..."
bun run changelog

# 5. Format + lint so CI stays green
Write-Host "Running format + lint..."
bun run format
bun run lint

# 6. Commit + tag
Write-Host "Creating release commit and tag $NEW_VERSION..."
git add -A
git status --short
git commit -m "$NEW_VERSION"
git tag -f $NEW_VERSION HEAD

# 7. Package build (frontend / shared). Tauri MSI/NSIS is built by GitHub Actions on the tag.
Write-Host "Running workspace build..."
bun run build

Write-Host "Release process complete for $NEW_VERSION."
Write-Host "Pushing commit and tags (triggers Release Windows workflow)..."
git push
git push --tags --force

Write-Host "Done. Watch: gh run list --workflow `"Release Windows`""
