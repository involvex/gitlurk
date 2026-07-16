# scripts/release.ps1
# Bumps workspace + Tauri versions, refreshes CHANGELOG, tags, and pushes.
# Pushing v* tags triggers the Release Windows GitHub Actions workflow.

$ErrorActionPreference = 'Stop'

Write-Host "GitLurk release (PowerShell)..."

Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
  Write-Host "Error: Uncommitted changes detected. Commit or stash before releasing."
  Write-Host $gitStatus
  exit 1
}

Write-Host "Bumping patch version across package.json / tauri.conf / Cargo.toml..."
$bumpOutput = bun run scripts/bump-version.ts patch
$NEW_VERSION = ($bumpOutput | Select-Object -Last 1).Trim()
if (-not $NEW_VERSION.StartsWith('v')) {
  throw "Expected bump script to print vX.Y.Z, got: $NEW_VERSION"
}
Write-Host "Version bumped to $NEW_VERSION"

Write-Host "Generating CHANGELOG.md..."
bun run changelog

Write-Host "Running format + lint..."
bun run format
bun run lint

Write-Host "Creating release commit and tag $NEW_VERSION..."
git add -A
# Keep local Cursor hook state out of the release commit when present
git reset HEAD -- .cursor/hooks/state/continual-learning.json 2>$null
git commit -m "$NEW_VERSION"
git tag -f $NEW_VERSION HEAD

Write-Host "Running workspace build (Tauri MSI/NSIS built by Actions on tag)..."
bun run build

Write-Host "Pushing commit and tags..."
git push
git push --tags --force

Write-Host "Done. Watch: gh run list --workflow `"Release Windows`""
