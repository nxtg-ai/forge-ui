# NXTG-Forge: Launch Chrome with Remote Debugging
# Run this on Windows (PowerShell) to enable Claude Code browser access from WSL
#
# Usage: powershell.exe -File scripts/launch-chrome-debug.ps1
# Or from WSL: powershell.exe -File "$(wslpath -w scripts/launch-chrome-debug.ps1)"

$ChromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$DebugPort = 9222

# Check if Chrome is already running with debugging
$existingChrome = Get-NetTCPConnection -LocalPort $DebugPort -ErrorAction SilentlyContinue
if ($existingChrome) {
    Write-Host "Chrome is already running with remote debugging on port $DebugPort" -ForegroundColor Green
    Write-Host "DevTools URL: http://localhost:$DebugPort" -ForegroundColor Cyan
    exit 0
}

Write-Host "Starting Chrome with remote debugging on port $DebugPort..." -ForegroundColor Yellow
Write-Host "This allows Claude Code (in WSL) to see your browser console, take screenshots, and debug UI issues." -ForegroundColor Gray

# Launch Chrome with remote debugging enabled, listening on all interfaces (so WSL can reach it)
Start-Process $ChromePath -ArgumentList @(
    "--remote-debugging-port=$DebugPort",
    "--remote-debugging-address=0.0.0.0",
    "--user-data-dir=$env:TEMP\chrome-debug-profile",
    "http://localhost:5050"
)

Start-Sleep -Seconds 2

# Verify it's running
$check = Get-NetTCPConnection -LocalPort $DebugPort -ErrorAction SilentlyContinue
if ($check) {
    Write-Host ""
    Write-Host "Chrome DevTools ready!" -ForegroundColor Green
    Write-Host "  DevTools URL: http://localhost:$DebugPort" -ForegroundColor Cyan
    Write-Host "  NXTG-Forge UI: http://localhost:5050" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Claude Code can now see your browser console and take screenshots." -ForegroundColor White
} else {
    Write-Host "Failed to start Chrome with debugging. Check Chrome path." -ForegroundColor Red
    exit 1
}
