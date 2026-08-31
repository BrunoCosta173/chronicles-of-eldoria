@echo off
rem Eldoria dev server - runs detached in its own window, persists after this launcher closes.
set DIR=%~dp0
cd /d "%DIR%"
rem Kill any previous instance holding our port so we don't get EADDRINUSE.
for /f "tokens=5" %%p in ('netstat -ano ^| findstr :8080 ^| findstr LISTENING') do taskkill /F /PID %%p >nul 2>&1
echo Starting Chronicles of Eldoria server on http://localhost:8080
start "Eldoria Server" /min cmd /c "cd /d ""%DIR%"" && node server.js"
echo.
echo Server running in a minimized window 'Eldoria Server'.
echo Open http://localhost:8080 in your browser.
echo Close the 'Eldoria Server' window (or run stop-server.bat) to stop it.
echo.
pause
