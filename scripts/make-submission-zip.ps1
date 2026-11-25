# Creates the Moodle submission ZIP:  <StudentID>-<Name>.zip
# Layout (as the brief asks):
#   src/        all implemented source code (backend, frontend, database, docs, postman ...)
#   ShiftManager_Final_Report.docx / .pdf   the final report at the top level
# Excludes node_modules, .env files, certificates, build output, coverage and git data.
#
# Usage (from C:\ShiftManager_Final):
#   powershell -ExecutionPolicy Bypass -File scripts\make-submission-zip.ps1 -StudentId 1234567 -Name "FirstLast"

param(
  [Parameter(Mandatory = $true)][string]$StudentId,
  [Parameter(Mandatory = $true)][string]$Name,
  [string]$OutputDir = ""
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$zipName = "$StudentId-$Name.zip"
if (-not $OutputDir) { $OutputDir = Join-Path $root "submission" }
New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
$zipPath = Join-Path $OutputDir $zipName
$staging = Join-Path $env:TEMP "shiftmanager-submission"

$excludeDirs = @('node_modules', 'dist', 'coverage', '.git', 'submission', 'certs')
$excludeFiles = @('.env')

if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Path $staging | Out-Null

Get-ChildItem -Path $root -Recurse -File -Force | Where-Object {
  $rel = $_.FullName.Substring($root.Length + 1)
  $parts = $rel -split '[\\/]'
  $isDocBinary = ($rel -match '^docs[\\/][^\\/]+\.(docx|pdf|html)$')   # reports go at the ZIP root, not inside src
  -not ($parts | Where-Object { $excludeDirs -contains $_ }) -and -not ($excludeFiles -contains $_.Name) -and -not $isDocBinary -and ($_.Name -notmatch '^~\$|\.log$|\.tmp$')
} | ForEach-Object {
  $rel = $_.FullName.Substring($root.Length + 1)
  $dest = Join-Path $staging "src\$rel"
  New-Item -ItemType Directory -Path (Split-Path -Parent $dest) -Force | Out-Null
  Copy-Item $_.FullName $dest
}

if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
foreach ($report in 'ShiftManager_Final_Report.docx', 'ShiftManager_Final_Report.pdf') {
  $file = Join-Path $root "docs\$report"
  if (Test-Path $file) { Copy-Item $file (Join-Path $staging $report) } else { Write-Host "WARNING: $report not found" -ForegroundColor Yellow }
}
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath
Remove-Item $staging -Recurse -Force

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [IO.Compression.ZipFile]::OpenRead($zipPath)
$names = $archive.Entries | ForEach-Object { $_.FullName }
$archive.Dispose()

Write-Host "Created $zipPath ($([math]::Round((Get-Item $zipPath).Length / 1KB)) KB, $($names.Count) files)" -ForegroundColor Green
if ($names | Where-Object { $_ -match '(^|[\\/])\.env$' -or $_ -match 'node_modules' -or $_ -match '\.pem$' }) {
  Write-Host "WARNING: .env or node_modules found in ZIP!" -ForegroundColor Red
} else {
  Write-Host "Checked: no .env and no node_modules in the ZIP" -ForegroundColor Green
}

