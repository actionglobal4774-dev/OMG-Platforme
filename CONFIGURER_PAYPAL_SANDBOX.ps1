$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

Set-Location -LiteralPath $projectPath

Write-Host "Configuration PayPal SANDBOX (argent fictif uniquement)" -ForegroundColor Cyan
Write-Host "Utilisez les identifiants de l'application Sandbox PayPal Developer." -ForegroundColor Yellow
Write-Host "Firebase va demander chaque valeur. Collez-la dans le terminal, jamais dans le code ou le chat." -ForegroundColor Yellow

Write-Host "Etape 1/4 - Client ID PayPal Sandbox" -ForegroundColor Cyan
& $firebasePath functions:secrets:set PAYPAL_CLIENT_ID --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le Client ID PayPal n'a pas ete enregistre." }

Write-Host "Etape 2/4 - Client Secret PayPal Sandbox" -ForegroundColor Cyan
& $firebasePath functions:secrets:set PAYPAL_CLIENT_SECRET --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le Client Secret PayPal n'a pas ete enregistre." }

Write-Host "Etape 3/4 - Deploiement des deux fonctions PayPal" -ForegroundColor Cyan
& $firebasePath deploy --only "functions:createPayPalOrderSecure,functions:capturePayPalOrderSecure" --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Les fonctions PayPal n'ont pas ete deployees." }

Write-Host "Etape 4/4 - Construction et publication du frontend" -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du frontend a echoue." }
& $firebasePath deploy --only hosting --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le frontend PayPal n'a pas ete publie." }

Write-Host "PayPal Sandbox est configure. Aucun paiement reel n'est active." -ForegroundColor Green
