$projectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$electronExe = Join-Path $projectRoot "node_modules\electron\dist\electron.exe"

Set-Location $projectRoot

if (Test-Path $electronExe) {
  & $electronExe .
} else {
  Write-Host "Electron executable was not found. Please run npm install first."
  Read-Host "Press Enter to exit"
}
