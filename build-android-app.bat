@echo off
echo Building Step Scientists Android App...

REM Make sure we're in the right directory
cd /d "%~dp0"

echo.
echo Step 1: Installing dependencies...
npm install

echo.
echo Step 2: Starting Metro bundler in background...
start "Metro Bundler" cmd /k "npx react-native start"

echo.
echo Step 3: Building and installing on device/emulator...
echo Make sure you have:
echo - Android device connected with USB debugging enabled, OR
echo - Android emulator running from Android Studio
echo.
pause

npx react-native run-android

echo.
echo Build complete! Check your device/emulator for the Step Scientists app.
pause