Set-Location "C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509"

if (-not (Test-Path ".\dist\index.html")) {
  Write-Host "Construction du site avant ouverture..."
  npm.cmd run build
}

Write-Host "Ouverture de OMG Platforme 509 sur http://127.0.0.1:8090/#/"

Start-Process powershell.exe -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd `"C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509`"; node .\serve-dist-509.cjs"
)

Start-Sleep -Seconds 3
Start-Process "http://127.0.0.1:8090/#/"
