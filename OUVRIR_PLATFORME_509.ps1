Set-Location "C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509"

if (-not (Test-Path ".\package.json")) {
  Write-Host "Erreur: package.json introuvable dans le dossier frontend 509."
  exit 1
}

if (-not (Test-Path ".\node_modules\.bin\vite.cmd")) {
  Write-Host "Installation des dependances manquantes..."
  npm.cmd install
}

Write-Host "Construction du site OMG Platforme 509..."
npm.cmd run build

Write-Host "Ouverture du serveur local OMG Platforme 509..."
Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509`"; node serve-dist-509.cjs"
)

Start-Sleep -Seconds 4
Start-Process "http://127.0.0.1:8090/#/"

Write-Host "Si 8090 est occupe, regardez la nouvelle fenetre PowerShell: elle affiche l'adresse exacte a ouvrir."
