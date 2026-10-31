$conn = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($conn) {
  Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  Write-Output "Stopped PID $($conn.OwningProcess) on :3000"
} else {
  Write-Output 'Nothing listening on :3000'
}
