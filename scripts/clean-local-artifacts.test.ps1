#requires -Version 7.0
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$fixture = Join-Path $root ('.supabase-test\startup-cleanup-test-' + [guid]::NewGuid())
function Assert-True($condition, $message) { if (-not $condition) { throw $message } }
try {
    New-Item -ItemType Directory -Path (Join-Path $fixture 'scripts') -Force | Out-Null
    $script = Join-Path $fixture 'scripts\clean-local-artifacts.ps1'
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'clean-local-artifacts.ps1') -Destination $script
    foreach ($name in @('.next','.next-e2e-3099','.next-e2e-3098','.next-e2e-3097')) {
        $folder = Join-Path $fixture $name
        New-Item -ItemType Directory -Path $folder | Out-Null
        Set-Content -LiteralPath (Join-Path $folder 'keep.txt') -Value 'fixture'
        if ($name -ne '.next-e2e-3097') { (Get-Item -LiteralPath $folder -Force).LastWriteTime = (Get-Date).AddHours(-2) }
    }
    $state = Join-Path $fixture '.supabase-test'
    New-Item -ItemType Directory -Path (Join-Path $state 'supabase\.temp') -Force | Out-Null
    foreach ($path in @('.env.e2e.local','.supabase-test\cosmetics-before-test.json','.supabase-test\supabase\.temp\project-ref')) { Set-Content -LiteralPath (Join-Path $fixture $path) -Value 'protected fixture' }
    foreach ($number in 0..3) {
        $folder = Join-Path $state "result-$number"
        New-Item -ItemType Directory -Path $folder | Out-Null
        Set-Content -LiteralPath (Join-Path $folder '.last-run.json') -Value '{}'
        Set-Content -LiteralPath (Join-Path $folder 'test-failed-1.png') -Value 'capture'
        (Get-Item -LiteralPath $folder).LastWriteTime = (Get-Date).AddDays(-10).AddHours($number)
    }
    # Mock OS inventory only; use real filesystem planning and deletion in our fixture.
    function Get-CimInstance { @([pscustomobject]@{ProcessId=101;CommandLine="node $fixture\node_modules\next\dist\server\lib\start-server.js"},[pscustomobject]@{ProcessId=102;CommandLine='node next dev --port 3011'},[pscustomobject]@{ProcessId=103;CommandLine="pwsh -Command Write-Output '.next-e2e-3096'; Write-Output 'expired build folder'"}) }
    function Get-NetTCPConnection { @([pscustomobject]@{LocalPort=3011;OwningProcess=101},[pscustomobject]@{LocalPort=3099;OwningProcess=103}) }
    $active = & $script -Apply -OnDevelopmentStart | ConvertFrom-Json
    Assert-True $active.QaServerRunning 'Running QA server not recognized'
    Assert-True (Test-Path -LiteralPath (Join-Path $fixture '.next\keep.txt')) 'Active QA build removed'
    Assert-True (Test-Path -LiteralPath (Join-Path $fixture '.next-e2e-3099\keep.txt')) 'Active E2E build removed'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture '.next-e2e-3098'))) 'Inactive old build retained'
    Assert-True (Test-Path -LiteralPath (Join-Path $state 'result-0')) 'Reports removed while tests were active'
    function Get-CimInstance { @() }
    function Get-NetTCPConnection { @() }
    $inactive = & $script -Apply -OnDevelopmentStart | ConvertFrom-Json
    Assert-True (-not $inactive.QaServerRunning) 'Inactive server reported as running'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $fixture '.next'))) 'Inactive development cache retained'
    Assert-True (Test-Path -LiteralPath (Join-Path $fixture '.next-e2e-3097\keep.txt')) 'Fresh cache removed'
    Assert-True (-not (Test-Path -LiteralPath (Join-Path $state 'result-0'))) 'Expired report retained'
    foreach ($number in 1..3) { Assert-True (Test-Path -LiteralPath (Join-Path $state "result-$number\test-failed-1.png")) 'Recent report retention failed' }
    function Get-CimInstance { @([pscustomobject]@{ProcessId=105;CommandLine='node next build --webpack'}) }
    $building = & $script -Apply -OnDevelopmentStart | ConvertFrom-Json
    Assert-True ($building.SkippedReason -eq 'Next.js build in progress' -and $building.Deleted.Count -eq 0) 'Build-in-progress was not protected'
    foreach ($path in @('.env.e2e.local','.supabase-test\cosmetics-before-test.json','.supabase-test\supabase\.temp\project-ref')) { Assert-True ((Get-Content -LiteralPath (Join-Path $fixture $path)).Trim() -eq 'protected fixture') 'Settings or backup changed' }
    Write-Output 'Startup cleanup: active QA/E2E, inactive cache, retention, build and backup checks passed.'
} finally {
    if ((Split-Path -Parent $fixture) -ne (Join-Path $root '.supabase-test')) { throw 'Invalid fixture cleanup path' }
    if (Test-Path -LiteralPath $fixture) { Remove-Item -LiteralPath $fixture -Recurse -Force }
}
