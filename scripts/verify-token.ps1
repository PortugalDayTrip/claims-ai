$c = Get-Content 'data/claims.json' -Raw | ConvertFrom-Json
$cl = $c.claims[0]
Write-Output "claim=$($cl.id) token=$($cl.token) status=$($cl.status)"
try {
  $pub = Invoke-RestMethod -Uri "http://localhost:3000/api/c/$($cl.token)"
  Write-Output "PUBLIC API: status=$($pub.status) asset=$($pub.fnol.assetType) evidence=$($pub.evidenceCount)"
} catch {
  Write-Output "PUBLIC API ERROR: $($_.Exception.Message)"
}
try {
  $p = Invoke-WebRequest -Uri "http://localhost:3000/c/$($cl.token)" -UseBasicParsing
  Write-Output "CUSTOMER PAGE: $($p.StatusCode)"
} catch {
  Write-Output "PAGE ERROR: $($_.Exception.Message)"
}
try {
  Invoke-RestMethod -Uri "http://localhost:3000/api/c/badtoken"
} catch {
  Write-Output "BAD TOKEN -> $($_.Exception.Response.StatusCode.value__)"
}
