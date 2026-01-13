@echo off
echo Setting up Android development environment...

REM Set JAVA_HOME (adjust path if different)
set JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.0.17.10-hotspot
set PATH=%JAVA_HOME%\bin;%PATH%

REM Set ANDROID_HOME (adjust path if different)
set ANDROID_HOME=C:\Users\%USERNAME%\AppData\Local\Android\Sdk
set PATH=%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%ANDROID_HOME%\tools\bin;%PATH%

echo Environment variables set:
echo JAVA_HOME=%JAVA_HOME%
echo ANDROID_HOME=%ANDROID_HOME%

echo.
echo Testing Java installation...
java -version

echo.
echo Testing Android SDK...
adb version

echo.
echo Setup complete! You can now build Android apps.
pause