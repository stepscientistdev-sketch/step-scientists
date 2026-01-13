@echo off
echo Starting Step Monsters servers in background...

REM Start PostgreSQL if not running
net start postgresql-x64-14 2>nul

REM Start backend server in background
echo Starting backend server...
cd /d "%~dp0backend"
start "Step Monsters Backend" /min cmd /c "npm run dev"

REM Start frontend server in background  
echo Starting frontend server...
cd /d "%~dp0"
start "Step Monsters Frontend" /min cmd /c "python -m http.server 8080"

echo.
echo ✅ Servers started in background!
echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:8080
echo Mobile App: http://YOUR_IP:3000/app
echo.
echo Servers will continue running even when PC is locked.
echo To stop servers, run: stop-servers.bat
echo.
pause