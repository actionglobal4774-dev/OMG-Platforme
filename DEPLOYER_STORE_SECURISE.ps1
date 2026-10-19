$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Host "Etape 1/4 - Verification du frontend Store..." -ForegroundColor Cyan
& npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "Le controle frontend a echoue." }

Write-Host "Etape 2/4 - Verification du backend securise..." -ForegroundColor Cyan
& npm.cmd --prefix backend/functions run verify
if ($LASTEXITCODE -ne 0) { throw "Le controle backend a echoue." }

Write-Host "Etape 3/4 - Construction du site..." -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du site a echoue." }

$firebaseCommand = Get-Command firebase.cmd -ErrorAction SilentlyContinue
if (-not $firebaseCommand) { throw "Firebase CLI est introuvable." }

Write-Host "Etape 4/4 - Publication de Store, Payflow, PayPal, Stripe et Mailport..." -ForegroundColor Cyan
& $firebaseCommand.Source deploy `
  --project omg-platform-3d517 `
  --only "functions:createStoreOrderSecure,functions:completeStoreOrderWithPayflowSecure,functions:completeStoreOrderExternalSecure,firestore:rules,hosting"

if ($LASTEXITCODE -ne 0) { throw "Le deploiement Store securise a echoue." }
Write-Host "Store Online securise deploye avec succes." -ForegroundColor Green
