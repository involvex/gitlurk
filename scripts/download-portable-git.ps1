#Requires -Version 5.1
$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$TargetDir = Join-Path $Root "packages\app\src-tauri\resources\git"
$TempDir = Join-Path $env:TEMP "mygit-mingit"

if (Test-Path $TargetDir) {
    Remove-Item -Recurse -Force $TargetDir
}
New-Item -ItemType Directory -Path $TargetDir -Force | Out-Null

$ReleaseApi = "https://api.github.com/repos/git-for-windows/git/releases/latest"
$Release = Invoke-RestMethod -Uri $ReleaseApi -Headers @{ "User-Agent" = "MyGit-Desktop" }
$Asset = $Release.assets | Where-Object { $_.name -match "MinGit-.*-64-bit\.zip$" } | Select-Object -First 1

if (-not $Asset) {
    throw "MinGit 64-bit asset not found in latest Git for Windows release"
}

$ZipPath = Join-Path $env:TEMP $Asset.name
Write-Host "Downloading $($Asset.name)..."
Invoke-WebRequest -Uri $Asset.browser_download_url -OutFile $ZipPath

if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}
Expand-Archive -Path $ZipPath -DestinationPath $TempDir

$Extracted = Get-ChildItem -Path $TempDir -Directory | Select-Object -First 1
if (-not $Extracted) {
    throw "Failed to extract MinGit archive"
}

Copy-Item -Path (Join-Path $Extracted.FullName "*") -Destination $TargetDir -Recurse -Force
Write-Host "Portable Git installed to $TargetDir"

if (Test-Path (Join-Path $TargetDir "cmd\git.exe")) {
    & (Join-Path $TargetDir "cmd\git.exe") --version
} else {
    throw "git.exe not found after extraction"
}
