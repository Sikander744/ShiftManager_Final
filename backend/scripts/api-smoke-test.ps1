# ShiftManager API smoke test (PowerShell)
# Usage:
#   cd C:\ShiftManager_Final\backend
#   node scripts/seed.js          # once, creates the manager account (ankush12@gmail.com)
#   powershell -ExecutionPolicy Bypass -File scripts\api-smoke-test.ps1
#
# Prints PASS/FAIL for each check. Creates and cleans up its own test data.

$ErrorActionPreference = 'Stop'
$api = if ($env:SM_API) { $env:SM_API } else { 'http://localhost:5000/api' }   # override with $env:SM_API
$script:pass = 0; $script:fail = 0

function Call($method, $path, $token, $body) {
  $headers = @{}
  if ($token) { $headers.Authorization = "Bearer $token" }
  $params = @{ Uri = "$api$path"; Method = $method; Headers = $headers; ContentType = 'application/json' }
  if ($null -ne $body) { $params.Body = ($body | ConvertTo-Json -Depth 5) }
  try {
    $r = Invoke-WebRequest @params -UseBasicParsing
    return @{ status = [int]$r.StatusCode; body = ($r.Content | ConvertFrom-Json) }
  } catch {
    $resp = $_.Exception.Response
    $content = $_.ErrorDetails.Message
    return @{ status = [int]$resp.StatusCode; body = $(if ($content) { $content | ConvertFrom-Json } else { $null }) }
  }
}

function Check($name, $res, $expected) {
  if ($res.status -eq $expected) { $script:pass++; Write-Host ("PASS  {0,-55} {1}" -f $name, $res.status) -ForegroundColor Green }
  else { $script:fail++; Write-Host ("FAIL  {0,-55} got {1}, expected {2}: {3}" -f $name, $res.status, $expected, ($res.body | ConvertTo-Json -Compress)) -ForegroundColor Red }
}

Write-Host "`n=== AUTH ===" -ForegroundColor Cyan
# Manager account created by scripts/seed.js; two temporary employees are registered for this run
$managerEmail = 'ankush12@gmail.com'; $managerPassword = '12345678'
$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$empEmail = "smoke${stamp}a@example.com"; $emp3Email = "smoke${stamp}b@example.com"
Check 'Register temporary employee A' (Call POST '/auth/register' $null @{ name = 'Smoke Employee A'; email = $empEmail; password = 'Password123!' }) 201
Check 'Register temporary employee B' (Call POST '/auth/register' $null @{ name = 'Smoke Employee B'; email = $emp3Email; password = 'Password123!' }) 201
$mLogin = Call POST '/auth/login' $null @{ email = $managerEmail; password = $managerPassword }; Check 'Manager login' $mLogin 200
$eLogin = Call POST '/auth/login' $null @{ email = $empEmail; password = 'Password123!' }; Check 'Employee login' $eLogin 200
$e3Login = Call POST '/auth/login' $null @{ email = $emp3Email; password = 'Password123!' }; Check 'Second employee login' $e3Login 200
# NOTE: PowerShell variable names are case-insensitive ($E and $e are the SAME variable)
$M = $mLogin.body.token; $E = $eLogin.body.token; $E3 = $e3Login.body.token
$empId = $eLogin.body.user.id; $emp3Id = $e3Login.body.user.id
Check 'Wrong password rejected' (Call POST '/auth/login' $null @{ email = $empEmail; password = 'wrongpass1' }) 401
Check 'Incomplete registration rejected' (Call POST '/auth/register' $null @{ email = 'x@example.com' }) 400
Check 'Register as manager blocked (role field)' (Call POST '/auth/register' $null @{ name = 'Hacker'; email = "h$(Get-Random)@example.com"; password = 'Password123!'; role = 'manager' }) 400
Check 'Duplicate email rejected' (Call POST '/auth/register' $null @{ name = 'Dup'; email = $empEmail; password = 'Password123!' }) 409
Check 'NoSQL injection in login blocked' (Call POST '/auth/login' $null @{ email = @{ '$ne' = '' }; password = 'x' }) 400
Check 'Missing token -> 401' (Call GET '/shifts' $null $null) 401
Check 'Invalid token -> 401' (Call GET '/shifts' 'not.a.token' $null) 401
Check 'GET /auth/me' (Call GET '/auth/me' $E $null) 200

Write-Host "`n=== SHIFTS ===" -ForegroundColor Cyan
$yr = Get-Random -Minimum 2030 -Maximum 2099   # unique dates per run
$day = "$yr-01-15"
$s = Call POST '/shifts' $M @{ employeeId = $empId; date = $day; startTime = '09:00'; endTime = '13:00'; location = 'Front Desk' }; Check 'Manager creates shift' $s 201
$sid = $s.body.shift._id
$s3 = Call POST '/shifts' $M @{ employeeId = $emp3Id; date = $day; startTime = '09:00'; endTime = '13:00'; location = 'Kitchen' }; Check 'Manager creates shift for 2nd employee' $s3 201
$sid3 = $s3.body.shift._id
Check 'Conflicting shift rejected (409)' (Call POST '/shifts' $M @{ employeeId = $empId; date = $day; startTime = '12:00'; endTime = '15:00'; location = 'Bar' }) 409
Check 'Back-to-back shift allowed' ($b2b = Call POST '/shifts' $M @{ employeeId = $empId; date = $day; startTime = '13:00'; endTime = '15:00'; location = 'Bar' }) 201
Check 'Invalid date (2027-02-30) rejected' (Call POST '/shifts' $M @{ employeeId = $empId; date = '2027-02-30'; startTime = '09:00'; endTime = '10:00'; location = 'X' }) 400
Check 'Invalid time (25:00) rejected' (Call POST '/shifts' $M @{ employeeId = $empId; date = $day; startTime = '25:00'; endTime = '26:00'; location = 'X' }) 400
Check 'End before start rejected' (Call POST '/shifts' $M @{ employeeId = $empId; date = "$yr-01-16"; startTime = '17:00'; endTime = '09:00'; location = 'X' }) 400
Check 'Empty location rejected' (Call POST '/shifts' $M @{ employeeId = $empId; date = "$yr-01-16"; startTime = '09:00'; endTime = '10:00'; location = '   ' }) 400
Check 'Unknown employee rejected (404)' (Call POST '/shifts' $M @{ employeeId = '000000000000000000000000'; date = "$yr-01-16"; startTime = '09:00'; endTime = '10:00'; location = 'X' }) 404
Check 'Employee cannot create shift (403)' (Call POST '/shifts' $E @{ employeeId = $empId; date = "$yr-01-16"; startTime = '09:00'; endTime = '10:00'; location = 'X' }) 403
$all = Call GET '/shifts' $M $null; Check 'Manager lists all shifts' $all 200
$own = Call GET '/shifts' $E $null; Check 'Employee lists own shifts' $own 200
$foreign = @($own.body.shifts | Where-Object { $_.employeeId._id -ne $empId }).Count
if ($foreign -eq 0) { $script:pass++; Write-Host "PASS  Employee list contains only own shifts" -ForegroundColor Green } else { $script:fail++; Write-Host "FAIL  Employee sees $foreign foreign shifts" -ForegroundColor Red }
Check 'Employee cannot GET another employee shift (403)' (Call GET "/shifts/$sid3" $E $null) 403
Check 'Employee GET own shift by id' (Call GET "/shifts/$sid" $E $null) 200
$u = Call PUT "/shifts/$sid" $M @{ startTime = '08:00'; location = 'Warehouse' }; Check 'Manager updates shift' $u 200
Check 'Employee cannot update shift (403)' (Call PUT "/shifts/$sid" $E @{ location = 'Hacked' }) 403
Check 'Update with invalid ID (400)' (Call PUT '/shifts/abc123' $M @{ location = 'X' }) 400
Check 'Update missing shift (404)' (Call PUT '/shifts/000000000000000000000000' $M @{ location = 'X' }) 404
Check 'Update with unexpected field (400)' (Call PUT "/shifts/$sid" $M @{ hacked = $true }) 400
Check 'Update creating conflict (409)' (Call PUT "/shifts/$($b2b.body.shift._id)" $M @{ startTime = '12:00' }) 409
Check 'Employee cannot delete shift (403)' (Call DELETE "/shifts/$sid" $E $null) 403
Check 'Manager deletes shift' (Call DELETE "/shifts/$sid" $M $null) 200
Check 'Deleted shift now 404' (Call DELETE "/shifts/$sid" $M $null) 404
Call DELETE "/shifts/$sid3" $M $null | Out-Null; Call DELETE "/shifts/$($b2b.body.shift._id)" $M $null | Out-Null

Write-Host "`n=== LEAVE ===" -ForegroundColor Cyan
$l = Call POST '/leaves' $E @{ startDate = "$yr-03-01"; endDate = "$yr-03-05"; reason = '[smoke] Family holiday' }; Check 'Employee creates leave (pending)' $l 201
$lid = $l.body.leave._id
if ($l.body.leave.status -eq 'pending') { $script:pass++; Write-Host "PASS  New leave status is pending" -ForegroundColor Green } else { $script:fail++; Write-Host "FAIL  status=$($l.body.leave.status)" -ForegroundColor Red }
Check 'Invalid date range rejected' (Call POST '/leaves' $E @{ startDate = "$yr-03-10"; endDate = "$yr-03-01"; reason = 'X' }) 400
Check 'Overlapping leave rejected (409)' (Call POST '/leaves' $E @{ startDate = "$yr-03-04"; endDate = "$yr-03-06"; reason = 'X' }) 409
Check 'Manager cannot submit leave (403)' (Call POST '/leaves' $M @{ startDate = "$yr-03-01"; endDate = "$yr-03-02"; reason = 'X' }) 403
Check 'Employee views own leave list' (Call GET '/leaves' $E $null) 200
Check 'Other employee cannot view this leave (403)' (Call GET "/leaves/$lid" $E3 $null) 403
Check 'Other employee cannot edit this leave (403)' (Call PUT "/leaves/$lid" $E3 @{ reason = 'Hacked' }) 403
Check 'Employee updates pending leave' (Call PUT "/leaves/$lid" $E @{ reason = 'Family holiday - updated' }) 200
Check 'Manager views all leave' (Call GET '/leaves' $M $null) 200
Check 'Manager filters pending leave' (Call GET '/leaves?status=pending' $M $null) 200
Check 'Invalid status filter (400)' (Call GET '/leaves?status=hacked' $M $null) 400
Check 'Employee cannot approve leave (403)' (Call PATCH "/leaves/$lid/status" $E @{ status = 'approved' }) 403
Check 'Invalid status value (400)' (Call PATCH "/leaves/$lid/status" $M @{ status = 'maybe' }) 400
Check 'Manager approves leave' (Call PATCH "/leaves/$lid/status" $M @{ status = 'approved' }) 200
Check 'Invalid transition approved->rejected (409)' (Call PATCH "/leaves/$lid/status" $M @{ status = 'rejected' }) 409
Check 'Cannot edit reviewed leave (409)' (Call PUT "/leaves/$lid" $E @{ reason = 'Change' }) 409
Check 'Cannot cancel reviewed leave (409)' (Call DELETE "/leaves/$lid" $E $null) 409
$l2 = Call POST '/leaves' $E @{ startDate = "$yr-04-01"; endDate = "$yr-04-01"; reason = '[smoke] Appointment' }; Check 'Employee creates 2nd leave' $l2 201
Check 'Manager rejects leave' (Call PATCH "/leaves/$($l2.body.leave._id)/status" $M @{ status = 'rejected' }) 200
$l3 = Call POST '/leaves' $E @{ startDate = "$yr-05-01"; endDate = "$yr-05-02"; reason = 'To cancel' }; Check 'Employee creates 3rd leave' $l3 201
Check 'Other employee cannot cancel it (403)' (Call DELETE "/leaves/$($l3.body.leave._id)" $E3 $null) 403
Check 'Employee cancels pending leave' (Call DELETE "/leaves/$($l3.body.leave._id)" $E $null) 200
Check 'Leave invalid ID (400)' (Call GET '/leaves/xyz' $E $null) 400

Write-Host "`n=== NOTIFICATIONS ===" -ForegroundColor Cyan
Check 'Public VAPID key available' (Call GET '/notifications/public-key' $null $null) 200
Check 'Subscribe without token (401)' (Call POST '/notifications/subscribe' $null @{ endpoint = 'https://example.com/x'; keys = @{ p256dh = 'a'; auth = 'b' } }) 401
Check 'Invalid subscription rejected (400)' (Call POST '/notifications/subscribe' $E @{ endpoint = 'not-a-url' }) 400
Check 'Employee cannot trigger test push (403)' (Call POST '/notifications/test' $E @{}) 403

Write-Host "`n=== USERS ===" -ForegroundColor Cyan
Check 'Manager lists employees' (Call GET '/users/employees' $M $null) 200
Check 'Employee cannot list employees (403)' (Call GET '/users/employees' $E $null) 403
Check 'Manager dashboard stats' (Call GET '/users/stats' $M $null) 200

Write-Host "`n=== CLEANUP ===" -ForegroundColor Cyan
node scripts/cleanup-smoke.js
Write-Host ("`nRESULT: {0} passed, {1} failed`n" -f $script:pass, $script:fail) -ForegroundColor $(if ($script:fail) { 'Red' } else { 'Green' })


