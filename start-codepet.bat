@echo off
setlocal
cd /d "%~dp0"

if exist ".\node_modules\electron\dist\electron.exe" (
  ".\node_modules\electron\dist\electron.exe" .
) else (
  echo Electron executable was not found. Please run npm install first.
  pause
)
