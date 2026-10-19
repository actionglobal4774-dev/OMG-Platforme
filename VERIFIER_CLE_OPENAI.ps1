$ErrorActionPreference = "Stop"

$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"
$secretName = "OPENAI_API_KEY"
$temporaryOutput = Join-Path $env:TEMP "omg-openai-secret-check.tmp"

if (-not (Test-Path -LiteralPath $firebasePath)) {
    throw "Firebase CLI est introuvable."
}

try {
    & $firebasePath functions:secrets:access $secretName --project $projectId *> $temporaryOutput
    $result = $LASTEXITCODE

    if ($result -eq 0) {
        Write-Host "Secret OPENAI_API_KEY present et accessible." -ForegroundColor Green
    }
    else {
        Write-Host "Secret absent ou inaccessible. Reconnectez Firebase puis enregistrez-le de nouveau." -ForegroundColor Red
        exit $result
    }
}
finally {
    if (Test-Path -LiteralPath $temporaryOutput) {
        Remove-Item -LiteralPath $temporaryOutput -Force
    }
}
