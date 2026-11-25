# Initialises the 3-node replica set "rs0" and prints its status.
# Run after: docker compose -f database/docker-compose.yml up -d

$ErrorActionPreference = 'Stop'

Write-Host "Waiting for MongoDB containers..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
  $ok = docker exec sm-mongo1 mongosh --port 27018 --quiet --eval "db.adminCommand('ping').ok" 2>$null
  if ($ok -eq '1') { break }
  Start-Sleep -Seconds 2
}

$init = @"
try {
  rs.status().ok
  print('Replica set already initialised')
} catch (e) {
  rs.initiate({
    _id: 'rs0',
    members: [
      { _id: 0, host: 'localhost:27018', priority: 2 },
      { _id: 1, host: 'localhost:27019', priority: 1 },
      { _id: 2, host: 'localhost:27020', priority: 1 }
    ]
  })
  print('Replica set rs0 initiated')
}
"@
docker exec sm-mongo1 mongosh --port 27018 --quiet --eval $init

Write-Host "Waiting for a PRIMARY to be elected..." -ForegroundColor Cyan
for ($i = 0; $i -lt 30; $i++) {
  $primary = docker exec sm-mongo1 mongosh --port 27018 --quiet --eval "(rs.status().members.find(m => m.stateStr === 'PRIMARY') || {}).name || ''" 2>$null
  if ($primary) { break }
  Start-Sleep -Seconds 2
}

docker exec sm-mongo1 mongosh --port 27018 --quiet --eval "rs.status().members.forEach(m => print(m.name.padEnd(30), m.stateStr))"

Write-Host "`nUse this in backend/.env to run ShiftManager on the replica set:" -ForegroundColor Green
Write-Host "MONGO_URI=mongodb://localhost:27018,localhost:27019,localhost:27020/shiftmanager?replicaSet=rs0"
