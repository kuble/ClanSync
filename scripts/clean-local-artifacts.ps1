#requires -Version 7.0
param([switch]$Apply, [switch]$IncludeDevBuild, [switch]$OnDevelopmentStart, [ValidateRange(1024,65535)][int]$QaPort = 3011, [ValidateRange(1,365)][int]$ReportRetentionDays = 7, [ValidateRange(0,168)][int]$MinCacheAgeHours = 1)
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$processes = @(Get-CimInstance Win32_Process -ErrorAction Stop)
$sockets = @(Get-NetTCPConnection -State Listen -ErrorAction Stop)
$listeners = @($sockets | Select-Object -ExpandProperty LocalPort -Unique)
$qaSocket = $sockets | Where-Object LocalPort -eq $QaPort | Select-Object -First 1
$qaProcess = $processes | Where-Object ProcessId -eq $qaSocket.OwningProcess | Select-Object -First 1
$qaRunning = [bool]($qaSocket -and $qaProcess.CommandLine -like "*$workspace\node_modules\next\dist\server\lib\start-server.js*")
$qaOccupied = [bool]($listeners -contains $QaPort)
$nextCli = '(?i)(?:^|[\s\\/"])next(?:\.cmd|\.js)?"?\s+'
$nextServers = @($processes | Where-Object { $_.CommandLine -match ($nextCli + '(?:dev|start)(?:\s|$)') })
# Builds do not listen on a port yet; startup should preserve them and continue.
if ($processes | Where-Object { $_.CommandLine -match ($nextCli + 'build(?:\s|$)') }) {
    if (-not $OnDevelopmentStart) { throw 'A Next.js build is running; try cleanup after it completes.' }
    [pscustomobject]@{ Apply=[bool]$Apply; Candidates=@(); Protected=@(); Deleted=@(); QaServerRunning=$qaRunning; QaPortOccupied=$qaOccupied; SkippedReason='Next.js build in progress' } | ConvertTo-Json
    return
}
if ($OnDevelopmentStart) { $IncludeDevBuild = -not $qaOccupied -and $nextServers.Count -eq 0 }
if ($IncludeDevBuild -and ($qaOccupied -or $nextServers.Count -gt 0)) { throw 'Stop Next.js servers before including .next.' }
$candidates = [Collections.Generic.List[string]]::new()
$protected = [Collections.Generic.List[string]]::new()
foreach ($folder in Get-ChildItem -LiteralPath $workspace -Directory -Force) {
    $port = $null
    if ($folder.Name -eq '.next-e2e') { $port = 3010 }
    elseif ($folder.Name -match '^\.next-e2e-(\d+)$') { $port = [int]$Matches[1] }
    elseif ($IncludeDevBuild -and $folder.Name -eq '.next') { $candidates.Add($folder.FullName); continue }
    else { continue }
    if ($listeners -contains $port -or $folder.LastWriteTime -gt (Get-Date).AddHours(-$MinCacheAgeHours)) { $protected.Add($folder.Name) } else { $candidates.Add($folder.FullName) }
}
$cutoff = (Get-Date).AddDays(-$ReportRetentionDays)
# Only recognizable Playwright output roots; leave CLI state, DB backups and queries alone.
$qaState = Join-Path $workspace '.supabase-test'
$activeTests = @($listeners | Where-Object { $_ -ge 3000 -and $_ -le 3200 -and $_ -ne $QaPort })
if ((Test-Path -LiteralPath $qaState) -and $activeTests.Count -eq 0) {
    $reports = @(Get-ChildItem -LiteralPath $qaState -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName '.last-run.json') } | Sort-Object LastWriteTime -Descending)
    foreach ($folder in ($reports | Select-Object -Skip 3)) {
        if ($folder.LastWriteTime -lt $cutoff) { $candidates.Add($folder.FullName) }
    }
}
foreach ($name in @('playwright-report','test-results','blob-report')) {
    $target = Join-Path $workspace $name
    if ((Test-Path -LiteralPath $target) -and (Get-Item -LiteralPath $target).LastWriteTime -lt $cutoff -and $activeTests.Count -eq 0) { $candidates.Add($target) }
}
foreach ($target in $candidates) {
    $resolved = (Resolve-Path -LiteralPath $target).Path
    $parent = Split-Path -Parent $resolved
    $name = Split-Path -Leaf $resolved
    $topLevel = $parent -eq $workspace -and ($name -match '^\.next-e2e(?:-\d+)?$' -or $name -in @('playwright-report','test-results','blob-report') -or ($IncludeDevBuild -and $name -eq '.next'))
    $report = $parent -eq $qaState -and (Test-Path -LiteralPath (Join-Path $resolved '.last-run.json'))
    if (-not ($topLevel -or $report) -or ((Get-Item -LiteralPath $resolved -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw "Unsafe cleanup target: $resolved" }
}
$deleted = [Collections.Generic.List[string]]::new()
foreach ($target in $candidates) {
    if ($Apply) {
        # Recheck immediately before deletion in case another QA task started.
        $currentPorts = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object -ExpandProperty LocalPort -Unique)
        $name = Split-Path -Leaf $target
        $port = if ($name -eq '.next-e2e') { 3010 } elseif ($name -match '^\.next-e2e-(\d+)$') { [int]$Matches[1] } elseif ($name -eq '.next') { $QaPort } else { $null }
        if ($null -ne $port -and $currentPorts -contains $port) { $protected.Add($name); continue }
        if ($name -eq '.next' -and (Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -match ($nextCli + '(?:dev|start|build)(?:\s|$)') })) { $protected.Add($name); continue }
        if ($null -eq $port -and @($currentPorts | Where-Object { $_ -ge 3000 -and $_ -le 3200 -and $_ -ne $QaPort }).Count -gt 0) { $protected.Add($name); continue }
        Remove-Item -LiteralPath $target -Recurse -Force
        $deleted.Add($target)
    }
}
[pscustomobject]@{ Apply=[bool]$Apply; Candidates=$candidates.ToArray(); Protected=$protected.ToArray(); Deleted=$deleted.ToArray(); QaServerRunning=$qaRunning; QaPortOccupied=$qaOccupied } | ConvertTo-Json -Depth 3
