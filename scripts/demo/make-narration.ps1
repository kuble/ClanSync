param([string]$OutputDirectory = 'test-results/clansync-demo-2026-09-30')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$demoNarrator = New-Object System.Speech.Synthesis.SpeechSynthesizer
$demoNarrator.SelectVoice('Microsoft Heami Desktop')
$demoNarrator.Rate = 1
$demoNarrator.Volume = 100
$demoScenes = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'scenes.json') -Raw -Encoding utf8 | ConvertFrom-Json
$demoVoiceDirectory = Join-Path (Resolve-Path -LiteralPath $OutputDirectory) 'voice'
New-Item -ItemType Directory -Force -Path $demoVoiceDirectory | Out-Null
try {
    foreach ($demoScene in $demoScenes) {
        $demoNarrator.SetOutputToWaveFile((Join-Path $demoVoiceDirectory ($demoScene.id + '.wav')))
        $demoNarrator.Speak($demoScene.narration)
        $demoNarrator.SetOutputToNull()
    }
} finally {
    $demoNarrator.Dispose()
}
Write-Output "Korean narration: $($demoScenes.Count) scenes"
