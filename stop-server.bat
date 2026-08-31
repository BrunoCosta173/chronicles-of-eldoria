@echo off
rem Stops the Eldoria dev server by killing the process listening on port 8080.
echo Stopping Eldoria server on port 8080...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do (
  echo Killing PID %%p
  taskkill /F /PID %%p >nul 2>&1
)
echo Done.
pause
