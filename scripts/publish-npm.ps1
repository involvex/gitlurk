#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# Build and publish @involvex/gitlurk-desktop to npm.
# Requires: bun, npm login to the involvex org.

$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

Write-Host "Building workspace packages…"
bun run --filter @gitlurk/shared build
bun run --filter @gitlurk/git build
bun run --filter @gitlurk/gh build
bun run --filter @involvex/gitlurk-desktop build

$Dist = Join-Path $Root "packages\cli\dist\index.js"
if (-not (Test-Path $Dist)) {
  throw "Missing CLI bundle at $Dist"
}

Write-Host "Publishing @involvex/gitlurk-desktop…"
Set-Location (Join-Path $Root "packages\cli")
npm publish --access public

Write-Host "Done. Install with: npm i -g @involvex/gitlurk-desktop"
