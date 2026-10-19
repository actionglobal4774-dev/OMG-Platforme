$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"

if (-not (Test-Path -LiteralPath $firebasePath)) { throw "Firebase CLI est introuvable." }
Set-Location -LiteralPath $projectPath

Write-Host "Configuration MonCash SANDBOX (argent fictif uniquement)" -ForegroundColor Cyan
Write-Host "Copiez les valeurs REST API depuis le portail MonCash Sandbox." -ForegroundColor Yellow
Write-Host "Collez-les uniquement dans ce terminal, jamais dans le code ou le chat." -ForegroundColor Yellow

Write-Host "Etape 1/4 - Client ID MonCash Sandbox" -ForegroundColor Cyan
& $firebasePath functions:secrets:set MONCASH_CLIENT_ID --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le Client ID MonCash n'a pas ete enregistre." }

Write-Host "Etape 2/4 - Client Secret MonCash Sandbox" -ForegroundColor Cyan
& $firebasePath functions:secrets:set MONCASH_CLIENT_SECRET --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le Client Secret MonCash n'a pas ete enregistre." }

Write-Host "Etape 3/4 - Deploiement des fonctions MonCash" -ForegroundColor Cyan
& $firebasePath deploy --only "functions:createMonCashPaymentSecure,functions:verifyMonCashPaymentSecure" --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Les fonctions MonCash n'ont pas ete deployees." }

Write-Host "Etape 4/4 - Publication du frontend" -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du frontend a echoue." }
& $firebasePath deploy --only hosting --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le frontend MonCash n'a pas ete publie." }

Write-Host "MonCash Sandbox est configure et deploye." -ForegroundColor Green
