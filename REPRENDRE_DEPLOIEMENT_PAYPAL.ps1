$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

Set-Location -LiteralPath $projectPath

Write-Host "Reprise du deploiement PayPal avec Node.js 22" -ForegroundColor Cyan
Write-Host "Les identifiants PayPal deja enregistres ne seront pas redemandes." -ForegroundColor Yellow

& $firebasePath deploy --only "functions:createPayPalOrderSecure,functions:capturePayPalOrderSecure" --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Les fonctions PayPal n'ont pas ete deployees." }

& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du frontend a echoue." }

& $firebasePath deploy --only hosting --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le frontend PayPal n'a pas ete publie." }

Write-Host "PayPal Sandbox est maintenant deploye." -ForegroundColor Green
