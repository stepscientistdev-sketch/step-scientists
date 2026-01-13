@echo off
echo Stopping Step Monsters servers...

REM Kill backend server
taskkill /f /im node.exe /fi "WINDOWTITLE eq Step Monsters Backend*" 2>nul

REM Kill frontend server  
taskkill /f /im python.exe /fi "WINDOWTITLE eq Step Monsters Frontend*" 2>nul

REM Alternative: Kill all node and python processes (more aggressive)
REM taskkill /f /im node.exe 2>nul
REM taskkill /f /im python.exe 2>nul

echo.
echo ✅ Servers stopped!
echo.
pause