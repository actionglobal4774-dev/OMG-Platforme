Set-Location "C:\Users\actio\Documents\Codex\OMG-frontend-reconstruction-509"

Write-Host "Installation des dependances du frontend 509..."
npm.cmd install

Write-Host "Verification des traductions, routes et structure..."
npm.cmd run test:frontend

Write-Host "Construction web..."
npm.cmd run build

Write-Host "Frontend 509 verifie."
