# NXTG-Forge WSL2 Mobile Access Setup
# Run this script as Administrator in PowerShell
#
# Usage: .\setup-wsl2-mobile-access.ps1
# To remove: .\setup-wsl2-mobile-access.ps1 -Remove

param(
    [switch]$Remove
)

$ErrorActionPreference = "Stop"

# Check for admin privileges
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script requires Administrator privileges." -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

$ports = @(5050, 5051, 5173, 8003)
$firewallRuleName = "NXTG Forge"

if ($Remove) {
    Write-Host "Removing NXTG-Forge WSL2 port forwarding..." -ForegroundColor Yellow

    # Remove port forwarding rules
    foreach ($port in $ports) {
        netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null
    }

    # Remove firewall rule
    Remove-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue

    Write-Host "Cleanup complete!" -ForegroundColor Green
    exit 0
}

# Get WSL2 IP address
Write-Host "Getting WSL2 IP address..." -ForegroundColor Cyan
$wslIp = (wsl hostname -I 2>$null).Split()[0]

if (-not $wslIp) {
    Write-Host "ERROR: Could not get WSL2 IP. Is WSL2 running?" -ForegroundColor Red
    exit 1
}

Write-Host "WSL2 IP: $wslIp" -ForegroundColor Green

# Get Windows LAN IP
$lanIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
    $_.InterfaceAlias -match 'Ethernet|Wi-Fi|WLAN' -and $_.IPAddress -notmatch '^169\.'
} | Select-Object -First 1).IPAddress

Write-Host "Windows LAN IP: $lanIp" -ForegroundColor Green
Write-Host ""

# Set up port forwarding
Write-Host "Setting up port forwarding..." -ForegroundColor Cyan
foreach ($port in $ports) {
    # Remove existing rule if any
    netsh interface portproxy delete v4tov4 listenport=$port listenaddress=0.0.0.0 2>$null

    # Add new rule
    netsh interface portproxy add v4tov4 listenport=$port listenaddress=0.0.0.0 connectport=$port connectaddress=$wslIp
    Write-Host "  Port $port -> WSL2:$port" -ForegroundColor Gray
}

# Set up firewall rule
Write-Host "Setting up firewall rule..." -ForegroundColor Cyan
$existingRule = Get-NetFirewallRule -DisplayName $firewallRuleName -ErrorAction SilentlyContinue

if ($existingRule) {
    Write-Host "  Firewall rule already exists, updating..." -ForegroundColor Gray
    Remove-NetFirewallRule -DisplayName $firewallRuleName
}

New-NetFirewallRule -DisplayName $firewallRuleName -Direction Inbound -LocalPort ($ports -join ',') -Protocol TCP -Action Allow | Out-Null
Write-Host "  Firewall rule created" -ForegroundColor Gray

Write-Host ""
Write-Host "Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Access NXTG-Forge from your mobile device at:" -ForegroundColor Cyan
Write-Host "  http://${lanIp}:5050" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Your phone must be on the same WiFi network." -ForegroundColor Gray
Write-Host ""
Write-Host "To verify port forwarding:" -ForegroundColor Cyan
Write-Host "  netsh interface portproxy show v4tov4" -ForegroundColor Gray
Write-Host ""
Write-Host "To remove this setup:" -ForegroundColor Cyan
Write-Host "  .\setup-wsl2-mobile-access.ps1 -Remove" -ForegroundColor Gray
