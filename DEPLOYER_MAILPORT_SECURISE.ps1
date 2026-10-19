$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Host "Verification de Mailport securise..." -ForegroundColor Cyan
& npm.cmd run lint
if ($LASTEXITCODE -ne 0) { throw "Le controle frontend a echoue." }
& npm.cmd --prefix backend/functions run verify
if ($LASTEXITCODE -ne 0) { throw "Le controle backend a echoue." }
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La compilation a echoue." }

$firebaseCommand = Get-Command firebase.cmd -ErrorAction SilentlyContinue
if (-not $firebaseCommand) { throw "Firebase CLI est introuvable." }

Write-Host "Deploiement des fonctions Mailport, regles, index, stockage et site..." -ForegroundColor Cyan
& $firebaseCommand.Source deploy `
  --project omg-platform-3d517 `
  --only "functions:createModuleAccount,functions:publishMailportAddressSecure,functions:searchMailportAddressesSecure,functions:prepareMailportAddressPurchaseSecure,functions:completeMailportAddressPurchaseWithPayflowSecure,functions:completeMailportAddressPurchaseExternalSecure,functions:createMailportPackageSecure,functions:inspectMailportPackageSecure,functions:advanceMailportPackageSecure,firestore:rules,firestore:indexes,storage,hosting"

if ($LASTEXITCODE -ne 0) { throw "Le deploiement Mailport a echoue." }
Write-Host "Mailport securise deploye avec succes." -ForegroundColor Green
