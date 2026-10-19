$ErrorActionPreference = "Stop"

$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $projectRoot ".env.local"

Write-Host "Configuration securisee de Google Maps pour OMG Platform" -ForegroundColor Cyan
Write-Host "Collez la cle dans PowerShell. Elle ne sera pas affichee." -ForegroundColor Yellow
$secureKey = Read-Host "Cle Google Maps" -AsSecureString
$keyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)

try {
    $plainKey = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($keyPointer)

    if ([string]::IsNullOrWhiteSpace($plainKey)) {
        throw "La cle est vide. Aucun fichier n'a ete modifie."
    }

    $newEntry = "VITE_GOOGLE_MAPS_API_KEY=$plainKey"
    $existingLines = if (Test-Path -LiteralPath $envFile) {
        @(Get-Content -LiteralPath $envFile)
    } else {
        @()
    }

    $updatedLines = @($existingLines | Where-Object {
        $_ -notmatch '^\s*VITE_GOOGLE_MAPS_API_KEY\s*='
    })
    $updatedLines += $newEntry

    Set-Content -LiteralPath $envFile -Value $updatedLines -Encoding utf8
    Write-Host "Cle Google Maps enregistree avec succes." -ForegroundColor Green
    Write-Host "Les autres parametres de .env.local ont ete conserves." -ForegroundColor Green
}
finally {
    if ($keyPointer -ne [IntPtr]::Zero) {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($keyPointer)
    }
    Remove-Variable plainKey, secureKey, keyPointer -ErrorAction SilentlyContinue
}
