$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$npmPath = "C:\Program Files\nodejs\npm.cmd"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"

if (-not (Test-Path -LiteralPath $npmPath)) {
    throw "npm est introuvable. Node.js 20 doit etre installe."
}

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable. Installez firebase-tools avant de continuer."
}

$backendCommand = @"
Set-Location -LiteralPath '$projectPath'
& '$firebasePath' emulators:start --only functions,firestore,storage
"@

$frontendCommand = @"
Set-Location -LiteralPath '$projectPath'
& '$npmPath' run dev -- --host 127.0.0.1 --port 5180
"@

Write-Host "Ouverture du backend Firebase local..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $backendCommand
)

Write-Host "Ouverture du frontend ProMax..." -ForegroundColor Green
Start-Process powershell.exe -ArgumentList @(
    '-NoExit',
    '-NoProfile',
    '-ExecutionPolicy', 'Bypass',
    '-Command', $frontendCommand
)

Write-Host "Deux fenetres PowerShell ont ete ouvertes." -ForegroundColor Cyan
Write-Host "Frontend: http://127.0.0.1:5180/" -ForegroundColor Yellow
Write-Host "Emulator UI: http://127.0.0.1:4000/" -ForegroundColor Yellow
