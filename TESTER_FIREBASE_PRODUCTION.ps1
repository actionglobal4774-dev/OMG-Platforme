$ErrorActionPreference = "Stop"

function Get-EnvValue([string]$Name) {
  foreach ($file in @(".env.local", ".env")) {
    if (-not (Test-Path -LiteralPath $file)) { continue }
    $line = Get-Content -LiteralPath $file | Where-Object { $_ -match "^$([regex]::Escape($Name))=" } | Select-Object -First 1
    if ($line) { return ($line -split "=", 2)[1].Trim().Trim('"').Trim("'") }
  }
  return $null
}

function Invoke-Callable([string]$Name, [hashtable]$Data, [string]$Token, [string]$ProjectId) {
  $uri = "https://us-central1-$ProjectId.cloudfunctions.net/$Name"
  $headers = @{ Authorization = "Bearer $Token" }
  $body = @{ data = $Data } | ConvertTo-Json -Depth 12
  $response = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ContentType "application/json" -Body $body
  return $response.result
}

$apiKey = Get-EnvValue "VITE_FIREBASE_API_KEY"
$projectId = Get-EnvValue "VITE_FIREBASE_PROJECT_ID"
if (-not $apiKey -or -not $projectId) {
  throw "VITE_FIREBASE_API_KEY ou VITE_FIREBASE_PROJECT_ID absent de .env.local/.env."
}
if ($projectId -ne "omg-platform-3d517") {
  throw "Projet refuse: $projectId. Le test attend omg-platform-3d517."
}

$testId = "production-smoke-$([DateTimeOffset]::UtcNow.ToUnixTimeSeconds())"
$token = $null

try {
  Write-Host "[1/7] Creation d'une session Firebase temporaire..." -ForegroundColor Cyan
  $authUri = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=$([uri]::EscapeDataString($apiKey))"
  $auth = Invoke-RestMethod -Method Post -Uri $authUri -ContentType "application/json" -Body '{"returnSecureToken":true}'
  $token = $auth.idToken
  if (-not $token) { throw "Firebase Authentication n'a retourne aucun jeton." }
  Write-Host "PASS - Authentification Firebase" -ForegroundColor Green

  Write-Host "[2/7] Ecriture securisee via le backend..." -ForegroundColor Cyan
  $saved = Invoke-Callable "upsertUserModuleItem" @{
    moduleId = "payflow"
    collectionName = "production_smoke_tests"
    itemId = $testId
    item = @{
      id = $testId
      purpose = "firebase-production-validation"
      status = "created"
      createdAt = [DateTime]::UtcNow.ToString("o")
    }
  } $token $projectId
  if (-not $saved.ok) { throw "La fonction d'ecriture n'a pas confirme l'operation." }
  Write-Host "PASS - Ecriture Firestore via Cloud Function" -ForegroundColor Green

  Write-Host "[3/7] Lecture et verification..." -ForegroundColor Cyan
  $listed = Invoke-Callable "listUserModuleCollection" @{
    moduleId = "payflow"
    collectionName = "production_smoke_tests"
    limit = 20
  } $token $projectId
  $found = @($listed.items | Where-Object { $_.id -eq $testId })
  if ($found.Count -ne 1) { throw "L'element de test n'a pas ete retrouve dans Firestore." }
  Write-Host "PASS - Lecture Firestore et isolation utilisateur" -ForegroundColor Green

  Write-Host "[4/7] Suppression logique de l'element de test..." -ForegroundColor Cyan
  $deleted = Invoke-Callable "softDeleteUserModuleItem" @{
    moduleId = "payflow"
    collectionName = "production_smoke_tests"
    itemId = $testId
  } $token $projectId
  if (-not $deleted.ok) { throw "La suppression logique n'a pas ete confirmee." }
  Write-Host "PASS - Suppression logique" -ForegroundColor Green

  Write-Host "[5/7] Test reel de FRED 509 avec OpenAI..." -ForegroundColor Cyan
  $fred = Invoke-Callable "askFred509" @{
    message = "Reponds uniquement: OMG FIREBASE OK"
    moduleId = "platform"
    context = @{ purpose = "production-smoke-test" }
  } $token $projectId
  if (-not $fred.ok -or -not $fred.answer) { throw "FRED 509 n'a retourne aucune reponse exploitable." }
  Write-Host "PASS - FRED 509: $($fred.answer)" -ForegroundColor Green

  Write-Host "[6/7] Test de la notification backend..." -ForegroundColor Cyan
  $notification = Invoke-Callable "sendModuleNotification" @{
    moduleId = "administration"
    moduleName = "Platform Administration"
    action = "Test notification production"
    operation = "sendModuleNotification"
    payload = @{ testId = $testId; noPersonalData = $true }
    source = "production-smoke-test"
  } $token $projectId
  if (-not $notification.ok -or -not $notification.reference) { throw "La notification backend n'a pas ete acceptee." }
  Write-Host "PASS - Notification backend acceptee: $($notification.reference)" -ForegroundColor Green

  Write-Host "[7/7] Nettoyage du compte temporaire..." -ForegroundColor Cyan
  $deleteUri = "https://identitytoolkit.googleapis.com/v1/accounts:delete?key=$([uri]::EscapeDataString($apiKey))"
  Invoke-RestMethod -Method Post -Uri $deleteUri -ContentType "application/json" -Body (@{ idToken = $token } | ConvertTo-Json) | Out-Null
  $token = $null
  Write-Host "PASS - Compte temporaire supprime" -ForegroundColor Green

  Write-Host "TEST FIREBASE PRODUCTION: REUSSI" -ForegroundColor Green
} catch {
  Write-Host "TEST FIREBASE PRODUCTION: ECHEC" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  if ($_.ErrorDetails.Message) {
    Write-Host "DETAIL FIREBASE:" -ForegroundColor Yellow
    Write-Host $_.ErrorDetails.Message -ForegroundColor Yellow
  }
  if ($_.Exception.Response) {
    try {
      $stream = $_.Exception.Response.GetResponseStream()
      if ($stream) {
        $reader = [System.IO.StreamReader]::new($stream)
        $detail = $reader.ReadToEnd()
        if ($detail) { Write-Host $detail -ForegroundColor Yellow }
      }
    } catch { }
  }
  exit 1
}
