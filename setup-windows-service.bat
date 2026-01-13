@echo off
echo Setting up Step Monsters as Windows scheduled tasks...

REM Create task for backend server
schtasks /create /tn "StepMonstersBackend" /tr "cmd /c cd /d \"%~dp0backend\" && npm run dev" /sc onstart /ru "%USERNAME%" /f

REM Create task for frontend server  
schtasks /create /tn "StepMonstersFrontend" /tr "cmd /c cd /d \"%~dp0\" && python -m http.server 8080" /sc onstart /ru "%USERNAME%" /f

echo.
echo ✅ Windows tasks created!
echo.
echo Tasks will start automatically on system boot.
echo To start manually: schtasks /run /tn "StepMonstersBackend"
echo To stop: schtasks /end /tn "StepMonstersBackend"
echo.
pause