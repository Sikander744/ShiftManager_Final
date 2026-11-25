# ShiftManager – database replication + failover demonstration
#
# Prerequisites:
#   docker compose -f database/docker-compose.yml up -d
#   powershell -ExecutionPolicy Bypass -File database/setup-replica-set.ps1
#   (the demo backend uses port 5055, so your normal backend on 5000 can keep running)
#
# Usage (from C:\ShiftManager_Final):
#   powershell -ExecutionPolicy Bypass -File database/replication-demo.ps1
#
# What it proves:
#   1. The API runs on a 3-node replica set (one PRIMARY, two SECONDARY).
#   2. Data written through the API is REPLICATED to the secondaries.
#   3. When the PRIMARY container is stopped, a new primary is ELECTED and the
#      API keeps working (automatic failover = high availability).

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$demoPort = 5055   # separate port so it never touches your normal backend on 5000
$api = "http://localhost:$demoPort/api"
$replicaUri = 'mongodb://localhost:27018,localhost:27019,localhost:27020/shiftmanager?replicaSet=rs0'

function Step($text) { Write-Host "`n=== $text ===" -ForegroundColor Cyan }
function RsStatus($container, $port) {
  docker exec $container mongosh --port $port --quiet --eval "rs.status().members.forEach(m => print('  ' + m.name.padEnd(30) + m.stateStr))"
}
function Post($path, $body, $token) {
  $h = @{}; if ($token) { $h.Authorization = "Bearer $token" }
  Invoke-RestMethod "$api$path" -Method Post -Headers $h -ContentType 'application/json' -Body ($body | ConvertTo-Json)
}

Step "1. Replica set status"
RsStatus 'sm-mongo1' 27018

Step "2. Start the backend on the replica set"
$env:MONGO_URI = $replicaUri          # dotenv does not override existing variables
$env:PORT = "$demoPort"
Push-Location "$root\backend"
node scripts/seed.js
if ($LASTEXITCODE -ne 0) { throw 'Cannot connect to the replica set - is it running and initialised?' }
$backend = Start-Process node -ArgumentList 'server.js' -PassThru -NoNewWindow -RedirectStandardOutput "$env:TEMP\sm-backend.log" -RedirectStandardError "$env:TEMP\sm-backend.err"
Pop-Location
$up = $false
for ($i = 0; $i -lt 20; $i++) { try { Invoke-RestMethod "$api/health" | Out-Null; $up = $true; break } catch { Start-Sleep 1 } }
if (-not $up) { Get-Content "$env:TEMP\sm-backend.err"; throw 'Demo backend did not start' }
Get-Content "$env:TEMP\sm-backend.log" | Select-Object -First 4

try {
  Step "3. Write data through the API"
  $stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $empEmail = "replica${stamp}@example.com"
  Post '/auth/register' @{ name = 'Replica Demo Employee'; email = $empEmail; password = 'Password123!' } | Out-Null
  $manager = Post '/auth/login' @{ email = 'ankush12@gmail.com'; password = '12345678' }
  $employee = Post '/auth/login' @{ email = $empEmail; password = 'Password123!' }
  $shift = Post '/shifts' @{ employeeId = $employee.user.id; date = '2099-06-01'; startTime = '09:00'; endTime = '17:00'; location = 'Replica Test A' } $manager.token
  Write-Host "  Created shift $($shift.shift._id) via the API (written to the PRIMARY)"

  Step "4. Read the same shift directly from a SECONDARY (proves replication)"
  Start-Sleep 2
  $query = "db.getMongo().setReadPref('secondary'); const s = db.getSiblingDB('shiftmanager').shifts.findOne({ _id: ObjectId('$($shift.shift._id)') }); print(s ? '  Found on secondary ' + db.hello().me + ': ' + s.location + ' ' + s.date : '  NOT FOUND')"
  docker exec sm-mongo2 mongosh --port 27019 --quiet --eval $query

  Step "5. Simulate a failure: stop the PRIMARY container (sm-mongo1)"
  docker stop sm-mongo1 | Out-Null
  Write-Host "  sm-mongo1 stopped. Waiting for election..."
  for ($i = 0; $i -lt 30; $i++) {
    $p = docker exec sm-mongo2 mongosh --port 27019 --quiet --eval "(rs.status().members.find(m => m.stateStr === 'PRIMARY') || {}).name || ''" 2>$null
    if ($p) { break }
    Start-Sleep 1
  }
  RsStatus 'sm-mongo2' 27019

  Step "6. The API still works after failover"
  $shift2 = Post '/shifts' @{ employeeId = $employee.user.id; date = '2099-06-02'; startTime = '10:00'; endTime = '16:00'; location = 'Replica Test B' } $manager.token
  Write-Host "  Created shift $($shift2.shift._id) after failover - written to the NEW primary" -ForegroundColor Green
  $list = Invoke-RestMethod "$api/shifts?from=2099-06-01&to=2099-06-02" -Headers @{ Authorization = "Bearer $($manager.token)" }
  Write-Host "  GET /api/shifts returned $($list.count) replica-test shift(s)" -ForegroundColor Green

  Step "7. Restart the failed node - it rejoins and catches up"
  docker start sm-mongo1 | Out-Null
  Start-Sleep 12
  RsStatus 'sm-mongo2' 27019

  Step "Backend log (topology / primary changes)"
  Get-Content "$env:TEMP\sm-backend.log" | Select-String 'topology|PRIMARY|disconnected|reconnected' | ForEach-Object { "  $_" }
}
finally {
  Step "Cleanup"
  Invoke-RestMethod "$api/health" -ErrorAction SilentlyContinue | Out-Null
  docker exec sm-mongo2 mongosh "mongodb://localhost:27018,localhost:27019,localhost:27020/shiftmanager?replicaSet=rs0" --quiet --eval "db.shifts.deleteMany({ date: { `$gte: '2099-01-01' } }); db.users.deleteMany({ email: /^replica\d+@example\.com$/ }); print('  Demo data removed')" 2>$null
  Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
  Remove-Item Env:\MONGO_URI, Env:\PORT -ErrorAction SilentlyContinue
  Write-Host "  Backend stopped. The replica set keeps running (docker compose -f database/docker-compose.yml down to stop it)."
}
