$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

Write-Host "Etape 1/3 - Verification du projet..." -ForegroundColor Cyan
npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "La verification du projet a echoue." }

Write-Host "Etape 2/3 - Construction de la nouvelle version..." -ForegroundColor Cyan
npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du site a echoue." }

Write-Host "Etape 3/3 - Publication de la correction du cache..." -ForegroundColor Cyan
firebase.cmd deploy --only hosting
if ($LASTEXITCODE -ne 0) { throw "La publication de la correction a echoue." }

Write-Host "Correction publiee avec succes." -ForegroundColor Green
Write-Host "Ouvrez maintenant : https://omg-platform-3d517.web.app/store" -ForegroundColor Green
