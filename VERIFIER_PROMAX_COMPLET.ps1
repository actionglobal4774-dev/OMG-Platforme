$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$npmPath = "C:\Program Files\nodejs\npm.cmd"

if (-not (Test-Path -LiteralPath $npmPath)) {
    throw "npm est introuvable. Fermez puis rouvrez Visual Studio Code apres l'installation de Node.js."
}

Set-Location -LiteralPath $projectPath

Write-Host "Verification du frontend ProMax..." -ForegroundColor Green
& $npmPath run verify:final
if ($LASTEXITCODE -ne 0) {
    throw "La verification du frontend a echoue."
}

Write-Host "Verification du backend ProMax..." -ForegroundColor Green
& $npmPath run backend:verify
if ($LASTEXITCODE -ne 0) {
    throw "La verification du backend a echoue."
}

Write-Host "==============================================" -ForegroundColor Green
Write-Host " Frontend et backend ProMax valides ensemble." -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green
