#Requires -Version 5.1
$ErrorActionPreference = "Stop"

function Find-RepoRoot([string]$StartDir) {
  $dir = $StartDir
  for ($i = 0; $i -lt 8; $i++) {
    $pkg = Join-Path $dir "package.json"
    if (Test-Path $pkg) {
      try {
        $json = Get-Content -Raw $pkg | ConvertFrom-Json
        $appPkg = Join-Path $dir "packages\app\package.json"
        if ($null -ne $json.workspaces -and (Test-Path $appPkg)) {
          return $dir
        }
      } catch {
        # keep walking
      }
    }
    $parent = Split-Path -Parent $dir
    if ($parent -eq $dir) { break }
    $dir = $parent
  }
  throw "Could not locate GitLurk monorepo root from $StartDir"
}

$Root = Find-RepoRoot $PSScriptRoot
$ConfigPath = Join-Path $Root "packages\app\src-tauri\tauri.conf.json"
$GitResources = Join-Path $Root "packages\app\src-tauri\resources\git"

Write-Host "Repo root: $Root"

if (-not (Test-Path $GitResources)) {
  throw "Git resources directory not found: $GitResources"
}

$files = Get-ChildItem -Path $GitResources -Recurse -File | ForEach-Object {
  $relative = $_.FullName.Substring($GitResources.Length + 1).Replace('\', '/')
  "resources/git/$relative"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$config.bundle.resources = @($files) + @("../../marketplace/catalog.json")
$json = $config | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText((Resolve-Path $ConfigPath), ($json + "`n"))

Write-Host "Updated tauri.conf.json with $($files.Count) git resource files"
