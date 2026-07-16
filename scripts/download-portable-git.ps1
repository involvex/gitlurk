#Requires -Version 5.1
$ErrorActionPreference = "Stop"

# Resolve monorepo root by walking up until package.json has workspaces
# (avoids off-by-one when Actions nesting differs).
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
Write-Host "Repo root: $Root"

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
  # Fallback: some archives extract git.exe under mingw64/bin
  $gitCandidate = Get-ChildItem -Path $TempDir -Recurse -Filter "git.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if (-not $gitCandidate) {
    throw "Failed to locate git.exe in extracted MinGit archive under $TempDir"
  }
  Write-Host "Warning: using non-cmd git.exe at $($gitCandidate.FullName)"
  $ExtractedRoot = $gitCandidate.Directory.Parent.FullName
} else {
  $ExtractedRoot = $gitCandidate.Directory.Parent.FullName
}

Write-Host "Extracted MinGit root: $ExtractedRoot"

function Install-MinGit([string]$Destination) {
  if (Test-Path $Destination) {
    Remove-Item -Recurse -Force $Destination
  }
  New-Item -ItemType Directory -Path $Destination -Force | Out-Null
  Copy-Item -Path (Join-Path $ExtractedRoot "*") -Destination $Destination -Recurse -Force

  $cmdGit = Join-Path $Destination "cmd\git.exe"
  $binGit = Join-Path $Destination "mingw64\bin\git.exe"
  $gitExe = if (Test-Path $cmdGit) { $cmdGit } elseif (Test-Path $binGit) { $binGit } else { $null }

  if (-not $gitExe) {
    Write-Host "Contents of $Destination :"
    Get-ChildItem $Destination | ForEach-Object { Write-Host "  $($_.Name)" }
    throw "git.exe not found after extraction at $Destination"
  }

  Write-Host "Portable Git installed to $Destination"
  & $gitExe --version
}

Install-MinGit $TargetDir
Install-MinGit $BundleDir
