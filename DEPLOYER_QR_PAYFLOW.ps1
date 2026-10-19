$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $projectRoot

Write-Host "Verification du QR Payflow securise..." -ForegroundColor Cyan
& npm.cmd run test:payflow
if ($LASTEXITCODE -ne 0) { throw "Le test Payflow a echoue." }

& npm.cmd --prefix backend/functions run verify
if ($LASTEXITCODE -ne 0) { throw "La verification du backend a echoue." }

& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La compilation du frontend a echoue." }

$firebaseCommand = Get-Command firebase.cmd -ErrorAction SilentlyContinue
if (-not $firebaseCommand) {
    throw "Firebase CLI est introuvable. Reinstallez firebase-tools avant le deploiement."
}

# Firebase analyse toutes les fonctions du fichier, meme lors d'un deploiement
# selectif. Le secret de change doit donc avoir au moins une version. Cette
# valeur d'attente n'active pas le moteur de change et sera remplacee par la
# vraie cle lorsque le fournisseur l'aura envoyee.
& $firebaseCommand.Source functions:secrets:access EXCHANGE_RATE_API_KEY `
    --project omg-platform-3d517 *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Creation d'une valeur d'attente pour l'API de change..." -ForegroundColor Yellow
    "PENDING_CONFIGURATION_DO_NOT_USE" | & $firebaseCommand.Source functions:secrets:set EXCHANGE_RATE_API_KEY `
        --project omg-platform-3d517 `
        --force
    if ($LASTEXITCODE -ne 0) {
        throw "Impossible de preparer le secret d'attente EXCHANGE_RATE_API_KEY."
    }
}

Write-Host "Deploiement des trois fonctions QR, des regles et du site..." -ForegroundColor Cyan
& $firebaseCommand.Source deploy `
    --project omg-platform-3d517 `
    --only "functions:createPayflowQrSessionSecure,functions:inspectPayflowQrSessionSecure,functions:redeemPayflowQrSessionSecure,firestore:rules,hosting"

if ($LASTEXITCODE -ne 0) { throw "Le deploiement du QR Payflow a echoue." }
Write-Host "QR Payflow deploye avec succes." -ForegroundColor Green
