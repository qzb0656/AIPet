$ErrorActionPreference = "Stop"

$codexDir = Join-Path $env:USERPROFILE ".codex"
$authPath = Join-Path $codexDir "auth.json"
$configPath = Join-Path $codexDir "config.toml"

Write-Host "This script will replace:" -ForegroundColor Yellow
Write-Host "  $authPath"
Write-Host "  $configPath"
Write-Host ""
Write-Host "Your API Key will be written locally and will not be printed back." -ForegroundColor Yellow
Write-Host ""

$apiKey = Read-Host "Please paste your API Key"

if ([string]::IsNullOrWhiteSpace($apiKey)) {
  Write-Host "No API Key entered. Nothing was changed." -ForegroundColor Red
  Read-Host "Press Enter to exit"
  exit 1
}

New-Item -ItemType Directory -Force -Path $codexDir | Out-Null

if (Test-Path $authPath) {
  Remove-Item -LiteralPath $authPath -Force
}

if (Test-Path $configPath) {
  Remove-Item -LiteralPath $configPath -Force
}

$auth = [ordered]@{
  OPENAI_API_KEY = $apiKey
}

$auth | ConvertTo-Json | Set-Content -LiteralPath $authPath -Encoding UTF8

@'
model_provider = "freemodel"
model = "gpt-5.5"
model_reasoning_effort = "xhigh"
disable_response_storage = true
preferred_auth_method = "apikey"

[model_providers.freemodel]
name = "freemodel"
base_url = "https://api.freemodel.dev"
wire_api = "responses"
'@ | Set-Content -LiteralPath $configPath -Encoding UTF8

Write-Host ""
Write-Host "Done. Codex freemodel config has been written." -ForegroundColor Green
Write-Host "auth.json and config.toml were updated under $codexDir"
Read-Host "Press Enter to exit"
