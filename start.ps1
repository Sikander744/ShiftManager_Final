# ShiftManager – start everything for development or the demo
#
# Usage (from C:\ShiftManager_Final):
#   powershell -ExecutionPolicy Bypass -File start.ps1            # dev mode  -> http://localhost:5173
#   powershell -ExecutionPolicy Bypass -File start.ps1 -Preview   # PWA build -> http://localhost:4173 (offline + push demo)
#   powershell -ExecutionPolicy Bypass -File start.ps1 -Seed      # also create demo accounts + demo data

param(
  [switch]$Preview,
  [switch]$Seed
)

$root = $PSScriptRoot

# 1. MongoDB service
$mongo = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
if (-not $mongo) {
  Write-Host "MongoDB service not found - start MongoDB manually." -ForegroundColor Yellow
} elseif ($mongo.Status -ne 'Running') {
  Write-Host "Starting MongoDB service..." -ForegroundColor Cyan
  Start-Service MongoDB
}

# 2. Check ports are free
foreach ($port in 5000, $(if ($Preview) { 4173 } else { 5173 })) {
  if (Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) {
    Write-Host "Port $port is already in use - stop the other server first (Ctrl+C in its window)." -ForegroundColor Red
    exit 1
  }
}

# 3. Optional demo data
if ($Seed) {
  Push-Location "$root\backend"
  node scripts/seed.js
  node scripts/seed-demo-data.js
  Pop-Location
}

# 4. Backend and frontend in their own windows
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; npm.cmd start"
if ($Preview) {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm.cmd run build; npm.cmd run preview"
  $url = "http://localhost:4173"
} else {
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm.cmd run dev"
  $url = "http://localhost:5173"
}

Write-Host "`nBackend : http://localhost:5000" -ForegroundColor Green
Write-Host "Frontend: $url" -ForegroundColor Green
Write-Host "Manager login: ankush12@gmail.com / 12345678  (employees: register in the app)`n"
Start-Sleep -Seconds 6
Start-Process $url
