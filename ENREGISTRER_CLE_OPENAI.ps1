$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

Set-Location -LiteralPath $projectPath

Write-Host "Enregistrement securise de OPENAI_API_KEY" -ForegroundColor Cyan
Write-Host "Ne mettez jamais cette cle dans VITE_*, .env frontend ou le code source." -ForegroundColor Yellow
Write-Host "Lorsque Firebase demande la valeur, collez uniquement la cle puis validez." -ForegroundColor Yellow

& $firebasePath functions:secrets:set OPENAI_API_KEY --project $projectId
if ($LASTEXITCODE -ne 0) {
    throw "Firebase n'a pas pu enregistrer le secret. Verifiez firebase login."
}

Write-Host "OPENAI_API_KEY est maintenant conservee dans Firebase Secret Manager." -ForegroundColor Green
