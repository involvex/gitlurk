#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# scripts/ -> repo root
$Root = Split-Path -Parent $PSScriptRoot
$TargetDir = Join-Path $Root "packages\app\src-tauri\resources\git"
$BundleDir = Join-Path $Root "packages\app\bundle-resources\git"
$TempDir = Join-Path $env:TEMP "gitlurk-mingit"

$ReleaseApi = "https://api.github.com/repos/git-for-windows/git/releases/latest"
$Release = Invoke-RestMethod -Uri $ReleaseApi -Headers @{ "User-Agent" = "GitLurk-Desktop" }
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

$gitCandidate = Get-ChildItem -Path $TempDir -Recurse -Filter "git.exe" -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -match '[\\/]cmd[\\/]git\.exe$' } |
  Select-Object -First 1

if (-not $gitCandidate) {
  throw "Failed to locate cmd/git.exe in extracted MinGit archive"
}

$ExtractedRoot = $gitCandidate.Directory.Parent.FullName

function Install-MinGit([string]$Destination) {
  if (Test-Path $Destination) {
    Remove-Item -Recurse -Force $Destination
  }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $ExtractedRoot "*") -Destination $Destination -Recurse -Force
  $gitExe = Join-Path $Destination "cmd\git.exe"
  if (-not (Test-Path $gitExe)) {
    throw "git.exe not found after extraction at $Destination"
  }
  Write-Host "Portable Git installed to $Destination"
  & $gitExe --version
}

Install-MinGit $TargetDir
Install-MinGit $BundleDir
