$ErrorActionPreference = "Stop"

$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"
$secretNames = @("MONCASH_CLIENT_ID", "MONCASH_CLIENT_SECRET")

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

$allValid = $true
foreach ($secretName in $secretNames) {
    $temporaryOutput = Join-Path $env:TEMP "omg-$secretName-check.tmp"
    try {
        & $firebasePath functions:secrets:access $secretName --project $projectId *> $temporaryOutput
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$secretName present et accessible." -ForegroundColor Green
        }
        else {
            Write-Host "$secretName absent ou inaccessible." -ForegroundColor Red
            $allValid = $false
        }
    }
    finally {
        if (Test-Path -LiteralPath $temporaryOutput) {
            Remove-Item -LiteralPath $temporaryOutput -Force
        }
    }
}

if (-not $allValid) {
    exit 1
}

Write-Host "Configuration MonCash verifiee." -ForegroundColor Green
