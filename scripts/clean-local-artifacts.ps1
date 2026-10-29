#requires -Version 7.0
param([switch]$Apply, [switch]$IncludeDevBuild, [ValidateRange(1,365)][int]$ReportRetentionDays = 7, [ValidateRange(0,168)][int]$MinCacheAgeHours = 1)
$ErrorActionPreference = 'Stop'
$workspace = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
# Builds do not listen on a port yet; leave their output alone as well.
if (Get-CimInstance Win32_Process -ErrorAction Stop | Where-Object { $_.CommandLine -match '(?i)next.*\sbuild(?:\s|$)' }) { throw 'A Next.js build is running; try cleanup after it completes.' }
$listeners = @(Get-NetTCPConnection -State Listen -ErrorAction Stop | Select-Object -ExpandProperty LocalPort -Unique)
if ($IncludeDevBuild -and $listeners -contains 3011) { throw 'Stop the QA server on 3011 before including .next.' }
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
if (Test-Path -LiteralPath $qaState) {
    $reports = @(Get-ChildItem -LiteralPath $qaState -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName '.last-run.json') } | Sort-Object LastWriteTime -Descending)
    foreach ($folder in ($reports | Select-Object -Skip 3)) {
        if ($folder.LastWriteTime -lt $cutoff) { $candidates.Add($folder.FullName) }
    }
}
$activeTests = @($listeners | Where-Object { $_ -ge 3000 -and $_ -le 3200 -and $_ -ne 3011 })
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
        $port = if ($name -eq '.next-e2e') { 3010 } elseif ($name -match '^\.next-e2e-(\d+)$') { [int]$Matches[1] } elseif ($name -eq '.next') { 3011 } else { $null }
        if ($null -ne $port -and $currentPorts -contains $port) { $protected.Add($name); continue }
        Remove-Item -LiteralPath $target -Recurse -Force
        $deleted.Add($target)
    }
}
[pscustomobject]@{ Apply=[bool]$Apply; Candidates=$candidates.ToArray(); Protected=$protected.ToArray(); Deleted=$deleted.ToArray() } | ConvertTo-Json -Depth 3
