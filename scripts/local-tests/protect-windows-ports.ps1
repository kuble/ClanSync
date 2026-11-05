# Run as administrator on Windows after installing Docker Desktop.
$ErrorActionPreference = 'Stop'
$ruleName = 'ClanSync-Local-Test-DB'
if (-not (Get-NetFirewallRule -Name $ruleName -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -Name $ruleName -DisplayName 'ClanSync local test DB - block inbound network access' -Direction Inbound -Action Block -Protocol TCP -LocalPort 55431,55432,55434 -Profile Any | Out-Null
}
Write-Output 'Local test database inbound ports protected; loopback remains available.'
