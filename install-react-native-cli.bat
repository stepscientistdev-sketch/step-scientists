@echo off
echo Installing React Native CLI...

npm install -g @react-native-community/cli

echo.
echo React Native CLI installed!
echo Testing installation...
npx react-native --version

pause