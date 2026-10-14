@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto nonode

if exist "node_modules\playwright" goto run
echo First run: installing the recorder - one-off, takes a couple of minutes...
call npm install
if errorlevel 1 goto failed
call npx playwright install chromium
if errorlevel 1 goto failed

:run
node tour.mjs %*
pause
exit /b 0

:nonode
echo Node.js is not installed. Get the LTS version from https://nodejs.org, then open a new PowerShell window and run this again.
pause
exit /b 1

:failed
echo The install did not finish. Check your internet connection and run this again.
pause
exit /b 1
