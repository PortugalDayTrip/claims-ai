$base = 'http://localhost:3000'
$demo = Invoke-RestMethod -Uri "$base/api/demo" -Method POST
Write-Output "DEMO created: id=$($demo.id)"
Write-Output "Customer URL: $base$($demo.url)"
$p = Invoke-WebRequest -Uri "$base$($demo.url)" -UseBasicParsing
Write-Output "GET /c/token -> $($p.StatusCode)"
$pub = Invoke-RestMethod -Uri "$base/api/c/$($demo.token)"
Write-Output "public api: claimant=$($pub.fnol.claimantName) asset=$($pub.fnol.assetType) status=$($pub.status)"
