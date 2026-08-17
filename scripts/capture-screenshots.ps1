# Capture Screenshots for GitLurk Desktop Documentation
# Usage: .\scripts\capture-screenshots.ps1
#
# Semi-automated: the script guides you through each screenshot.
# Press Enter after navigating to each view to capture.

param(
    [string]$OutputDir = "docs/images"
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$outputDir = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

Add-Type @"
using System;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Windows.Forms;
public class ScreenCapture {
    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
    public struct RECT { public int Left, Top, Right, Bottom; }
    public static Bitmap CapturePrimaryScreen() {
        var bounds = Screen.PrimaryScreen.Bounds;
        var bmp = new Bitmap(bounds.Width, bounds.Height);
        using (var g = Graphics.FromImage(bmp)) {
            g.CopyFromScreen(bounds.X, bounds.Y, 0, 0, bounds.Size);
        }
        return bmp;
    }
}
"@

$screenshots = @(
    @{ Name = "01-changes-view"; Description = "Main workspace: staged + unstaged files visible, diff panel open" },
    @{ Name = "02-history-graph"; Description = "History panel: commit log with branch topology graph, click a commit to show diff" },
    @{ Name = "03-branches"; Description = "Branch panel: list of branches with current branch highlighted" },
    @{ Name = "04-pull-requests"; Description = "Pull Requests panel (requires GitHub sign-in): list of open PRs" },
    @{ Name = "05-discover-hub"; Description = "Discover Hub: search repos or trending tab with results" },
    @{ Name = "06-ai-commit"; Description = "AI commit message: diff staged + click Generate to show AI message" },
    @{ Name = "07-ci-watch"; Description = "CI Watch dialog: a live GitHub Actions run streaming logs" },
    @{ Name = "08-settings"; Description = "Settings dialog: AI provider tab or Appearance tab open" },
    @{ Name = "09-terminal"; Description = "Embedded terminal pane: PTY session open at repo root" },
    @{ Name = "10-themes"; Description = "Theme switch: dark vs light side-by-side or toggle showing" },
    @{ Name = "11-command-palette"; Description = "Command palette overlay (Ctrl+Shift+P) with fuzzy search visible" },
    @{ Name = "12-stash-panel"; Description = "Stash panel: list of stashes with pop/drop actions" }
)

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " GitLurk Desktop Screenshot Capture" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Make sure GitLurk Desktop is running (bun run tauri:dev)" -ForegroundColor Yellow
Write-Host "and the demo repo (scripts/demo-repo) is open in the app." -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Enter when ready to begin..." -ForegroundColor Green
Read-Host | Out-Null

for ($i = 0; $i -lt $screenshots.Count; $i++) {
    $step = $screenshots[$i]
    $total = $screenshots.Count
    $num = $i + 1

    Write-Host ""
    Write-Host "[$num/$total] " -NoNewline -ForegroundColor Cyan
    Write-Host $step.Name -ForegroundColor White
    Write-Host "       $($step.Description)" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "       1. Navigate to this view in GitLurk Desktop" -ForegroundColor Gray
    Write-Host "       2. Make sure the app window is visible and focused" -ForegroundColor Gray
    Write-Host "       3. Press Enter to capture" -ForegroundColor Gray
    Write-Host "       4. Press 's' to skip this screenshot" -ForegroundColor Gray
    Write-Host ""

    $key = [Console]::ReadKey($true).Key
    if ($key -eq 'S') {
        Write-Host "   [SKIPPED]" -ForegroundColor DarkYellow
        continue
    }

    Write-Host "   Capturing..." -ForegroundColor Yellow
    Start-Sleep -Milliseconds 500

    try {
        $bitmap = [ScreenCapture]::CapturePrimaryScreen()
        $filepath = Join-Path $outputDir "$($step.Name).png"
        $bitmap.Save($filepath, [System.Drawing.Imaging.ImageFormat]::Png)
        $bitmap.Dispose()
        Write-Host "   Saved: $filepath" -ForegroundColor Green
    }
    catch {
        Write-Host "   ERROR: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " All done! Screenshots saved to $outputDir" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# List generated files
Get-ChildItem $outputDir -Filter "*.png" | ForEach-Object {
    $sizeKB = [math]::Round($_.Length / 1024, 1)
    Write-Host "  $($_.Name) ($sizeKB KB)" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Review and crop images if needed" -ForegroundColor Yellow
Write-Host "  2. The README.md has been written to reference these images" -ForegroundColor Yellow
Write-Host "  3. Commit: git add docs/images/ && git commit -m 'docs: add screenshots'" -ForegroundColor Yellow
