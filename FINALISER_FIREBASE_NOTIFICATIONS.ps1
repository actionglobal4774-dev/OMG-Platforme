$ErrorActionPreference = "Stop"

$projectPath = "C:\Users\actio\Documents\Codex\OMG-Platform-ProMax"
$firebasePath = "C:\Users\actio\AppData\Roaming\npm\firebase.cmd"
$projectId = "omg-platform-3d517"
$apkPath = Join-Path $projectPath "android\app\build\outputs\apk\debug\app-debug.apk"

if (-not (Test-Path -LiteralPath $firebasePath)) { throw "Firebase CLI est introuvable." }
if (-not (Test-Path -LiteralPath (Join-Path $projectPath "android\app\google-services.json"))) {
    throw "google-services.json est introuvable."
}

Set-Location -LiteralPath $projectPath

Write-Host "Etape 1/4 - Construction du frontend" -ForegroundColor Cyan
& npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "La construction du frontend a echoue." }

Write-Host "Etape 2/4 - Synchronisation Android et Firebase Notifications" -ForegroundColor Cyan
& npx.cmd cap sync android
if ($LASTEXITCODE -ne 0) { throw "La synchronisation Android a echoue." }

Write-Host "Etape 3/4 - Deploiement des fonctions et du frontend" -ForegroundColor Cyan
& $firebasePath deploy --only "functions:registerPushToken,functions:sendBackendNotification,hosting" --project $projectId
if ($LASTEXITCODE -ne 0) { throw "Le deploiement Firebase Notifications a echoue." }

Write-Host "Etape 4/4 - Creation de l'APK Android de test" -ForegroundColor Cyan
Set-Location -LiteralPath (Join-Path $projectPath "android")
& .\gradlew.bat assembleDebug
if ($LASTEXITCODE -ne 0) { throw "La creation de l'APK Android a echoue." }

if (-not (Test-Path -LiteralPath $apkPath)) { throw "L'APK attendu est introuvable." }
Write-Host "Firebase Notifications est configure." -ForegroundColor Green
Write-Host "APK de test : $apkPath" -ForegroundColor Green
