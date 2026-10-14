@echo off
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js isn't installed. Get the LTS version from https://nodejs.org and run this again. & pause & exit /b 1)
if not exist node_modules\playwright (
  echo First run: installing the recorder (one-off, a couple of minutes)...
  call npm install || (pause & exit /b 1)
  call npx playwright install chromium || (pause & exit /b 1)
)
node tour.mjs %*
pause
