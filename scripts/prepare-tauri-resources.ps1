#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$ConfigPath = Join-Path $Root "packages\app\src-tauri\tauri.conf.json"
$GitResources = Join-Path $Root "packages\app\src-tauri\resources\git"

if (-not (Test-Path $GitResources)) {
    throw "Git resources directory not found: $GitResources"
}

$files = Get-ChildItem -Path $GitResources -Recurse -File | ForEach-Object {
    $relative = $_.FullName.Substring($GitResources.Length + 1).Replace('\', '/')
    "resources/git/$relative"
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
$config.bundle.resources = @($files) + @("../../marketplace/catalog.json")
$config | ConvertTo-Json -Depth 20 | Set-Content $ConfigPath -Encoding UTF8

Write-Host "Updated tauri.conf.json with $($files.Count) git resource files"
