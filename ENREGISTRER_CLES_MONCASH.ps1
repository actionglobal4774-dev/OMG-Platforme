$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

Set-Location -LiteralPath $projectPath

Write-Host "Configuration securisee de MonCash" -ForegroundColor Cyan
Write-Host "Ne collez jamais ces valeurs dans le frontend, le chat ou un fichier VITE_*." -ForegroundColor Yellow

Write-Host "Firebase va demander le MonCash Client ID." -ForegroundColor Yellow
& $firebasePath functions:secrets:set MONCASH_CLIENT_ID --project $projectId
if ($LASTEXITCODE -ne 0) { throw "MONCASH_CLIENT_ID n'a pas ete enregistre." }

Write-Host "Firebase va maintenant demander le MonCash Client Secret." -ForegroundColor Yellow
& $firebasePath functions:secrets:set MONCASH_CLIENT_SECRET --project $projectId
if ($LASTEXITCODE -ne 0) { throw "MONCASH_CLIENT_SECRET n'a pas ete enregistre." }

Write-Host "Identifiants MonCash enregistres dans Firebase Secret Manager." -ForegroundColor Green
