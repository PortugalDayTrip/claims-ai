$ErrorActionPreference = 'SilentlyContinue'
$base = 'http://localhost:3000'

Write-Output '--- 1. Home page ---'
$r = Invoke-WebRequest -Uri "$base/" -UseBasicParsing
Write-Output "GET / -> $($r.StatusCode)"

Write-Output '--- 2. API claims without auth (expect 401) ---'
try {
  Invoke-WebRequest -Uri "$base/api/claims" -UseBasicParsing | Out-Null
  Write-Output 'GET /api/claims -> 200 (unexpected!)'
} catch {
  Write-Output "GET /api/claims -> $($_.Exception.Response.StatusCode.value__) (expected 401)"
}

Write-Output '--- 3. Adjuster page redirects to login ---'
try {
  Invoke-WebRequest -Uri "$base/adjuster" -UseBasicParsing -MaximumRedirection 0 | Out-Null
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  $loc = $_.Exception.Response.Headers['Location']
  Write-Output "GET /adjuster -> $code -> $loc"
}

Write-Output '--- 4. Login with wrong PIN (expect 401) ---'
try {
  Invoke-WebRequest -Uri "$base/api/login" -Method POST -ContentType 'application/json' -Body '{"pin":"9999"}' -UseBasicParsing | Out-Null
} catch {
  Write-Output "POST /api/login wrong pin -> $($_.Exception.Response.StatusCode.value__)"
}

Write-Output '--- 5. Login with correct PIN (1234) ---'
$resp = Invoke-WebRequest -Uri "$base/api/login" -Method POST -ContentType 'application/json' -Body '{"pin":"1234"}' -SessionVariable sess -UseBasicParsing
Write-Output "POST /api/login -> $($resp.StatusCode)"

Write-Output '--- 6. Create claim ---'
$body = @{
  claimantName = 'Joana Silva'
  claimantEmail = 'joana@example.com'
  policyNumber = 'POL-2026-001'
  assetType = 'vehicle'
  assetDescription = 'VW Golf 2019 preto'
  incidentDate = '2026-10-28'
  incidentLocation = 'Lisboa, A2'
  incidentType = 'Colisao'
} | ConvertTo-Json
$claim = Invoke-RestMethod -Uri "$base/api/claims" -Method POST -ContentType 'application/json' -Body $body -WebSession $sess
Write-Output "Created claim id=$($claim.id) token=$($claim.token) url=$($claim.url)"

Write-Output '--- 7. List claims as adjuster ---'
$list = Invoke-RestMethod -Uri "$base/api/claims" -WebSession $sess
Write-Output "Claims count: $($list.Count) - first: $($list[0].claimantName) status=$($list[0].status)"

Write-Output '--- 8. Public customer endpoint ---'
$pub = Invoke-RestMethod -Uri "$base/api/c/$($claim.token)"
Write-Output "GET /api/c/<token> -> status=$($pub.status) assetType=$($pub.fnol.assetType)"

Write-Output '--- 9. Public evidence page ---'
$page = Invoke-WebRequest -Uri "$base/c/$($claim.token)" -UseBasicParsing
Write-Output "GET /c/<token> -> $($page.StatusCode)"

Write-Output '--- 10. Bad token (expect 404) ---'
try {
  Invoke-RestMethod -Uri "$base/api/c/invalidtoken123"
} catch {
  Write-Output "GET /api/c/bad -> $($_.Exception.Response.StatusCode.value__) (expected 404)"
}

Write-Output '--- 11. Report endpoint before analysis ---'
try {
  $rep = Invoke-WebRequest -Uri "$base/api/claims/$($claim.id)/report" -WebSession $sess -UseBasicParsing
  Write-Output "GET report -> $($rep.StatusCode) ($($rep.RawContentLength) bytes HTML)"
} catch {
  Write-Output "GET report -> $($_.Exception.Response.StatusCode.value__)"
}

Write-Output "DONE. Claim id for manual check: $($claim.id)"
