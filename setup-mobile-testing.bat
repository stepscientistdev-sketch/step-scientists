@echo off
setlocal enabledelayedexpansion

echo 🚀 Setting up Step Monsters for Mobile Testing
echo ==============================================

REM Step 1: Get IP Address
echo.
echo 📱 Step 1: Network Configuration
echo ================================

REM Get the active network adapter's IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address" ^| findstr /v "127.0.0.1"') do (
    set "IP_RAW=%%a"
    REM Remove leading spaces
    for /f "tokens=* delims= " %%b in ("!IP_RAW!") do set "IP_ADDRESS=%%b"
    goto :found_ip
)

:found_ip
if "%IP_ADDRESS%"=="" (
    echo ❌ Could not automatically detect IP address
    echo Please run 'ipconfig' and find your IPv4 Address
    set /p IP_ADDRESS="Enter your IP address: "
)

echo ✅ Detected IP Address: %IP_ADDRESS%

REM Step 2: Update API Client
echo.
echo 🔧 Step 2: Updating API Configuration
echo =====================================

if exist "src\services\apiClient.ts" (
    copy "src\services\apiClient.ts" "src\services\apiClient.ts.backup" >nul 2>&1
    powershell -Command "(gc 'src\services\apiClient.ts') -replace 'const DEVELOPMENT_IP = ''YOUR_COMPUTER_IP'';', 'const DEVELOPMENT_IP = ''%IP_ADDRESS%'';' | Out-File -encoding UTF8 'src\services\apiClient.ts'"
    echo ✅ Updated API client to use IP: %IP_ADDRESS%
    echo ℹ️ API will be available at: http://%IP_ADDRESS%:3000/api
) else (
    echo ❌ API client file not found: src\services\apiClient.ts
    pause
    exit /b 1
)

REM Step 3: Verify Prerequisites
echo.
echo 🔍 Step 3: Verifying Prerequisites
echo ==================================

REM Check Node.js
node --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('node --version') do echo ✅ Node.js found: %%i
) else (
    echo ❌ Node.js not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Check npm
npm --version >nul 2>&1
if %errorlevel% equ 0 (
    for /f %%i in ('npm --version') do echo ✅ npm found: %%i
) else (
    echo ❌ npm not found. Please install npm first.
    pause
    exit /b 1
)

REM Check PostgreSQL
psql --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ PostgreSQL client found
) else (
    echo ⚠️ PostgreSQL client not found. Please ensure PostgreSQL is installed.
)

REM Step 4: Install Dependencies
echo.
echo 📦 Step 4: Installing Dependencies
echo ==================================

REM Frontend dependencies
if not exist "node_modules" (
    echo ℹ️ Installing frontend dependencies...
    call npm install
    if !errorlevel! equ 0 (
        echo ✅ Frontend dependencies installed
    ) else (
        echo ❌ Failed to install frontend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Frontend dependencies already installed
)

REM Backend dependencies
cd backend
if not exist "node_modules" (
    echo ℹ️ Installing backend dependencies...
    call npm install
    if !errorlevel! equ 0 (
        echo ✅ Backend dependencies installed
    ) else (
        echo ❌ Failed to install backend dependencies
        pause
        exit /b 1
    )
) else (
    echo ✅ Backend dependencies already installed
)

REM Step 5: Database Setup
echo.
echo 🗄️ Step 5: Database Setup
echo ==========================

REM Check if .env file exists
if not exist ".env" (
    echo ℹ️ Creating .env file with default database configuration...
    (
        echo # Database Configuration
        echo DB_HOST=localhost
        echo DB_PORT=5432
        echo DB_NAME=step_monsters
        echo DB_USER=postgres
        echo DB_PASSWORD=password
        echo.
        echo # Server Configuration
        echo PORT=3000
        echo NODE_ENV=development
        echo.
        echo # JWT Configuration
        echo JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
        echo JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
    ) > .env
    echo ✅ Created .env file with default configuration
    echo ⚠️ Please update database credentials in backend\.env if needed
)

REM Run migrations
echo ℹ️ Running database migrations...
call npm run migrate
if %errorlevel% equ 0 (
    echo ✅ Database migrations completed
) else (
    echo ❌ Database migrations failed. Please check your database connection.
    echo ℹ️ Make sure PostgreSQL is running and credentials in .env are correct
)

REM Seed data
echo ℹ️ Seeding initial data...
call npm run seed
if %errorlevel% equ 0 (
    echo ✅ Database seeding completed
) else (
    echo ⚠️ Database seeding failed. This might be okay if data already exists.
)

cd ..

REM Step 6: Final Instructions
echo.
echo 🚀 Step 6: Ready to Start!
echo ==========================

echo ✅ Setup complete! Next steps:
echo.
echo 1. Start the backend server:
echo    cd backend ^&^& npm run dev
echo.
echo 2. In a new terminal, build and run the mobile app:
echo    npx react-native run-android
echo.
echo 3. Test API connectivity from your mobile device:
echo    Open browser and visit: http://%IP_ADDRESS%:3000/health
echo.
echo 4. Follow the Mobile Testing Guide for comprehensive testing
echo.
echo ⚠️ Important Notes:
echo • Ensure your mobile device is on the same WiFi network
echo • Grant Google Fit permissions when prompted
echo • Check firewall settings if connection fails
echo • The API is configured to use IP: %IP_ADDRESS%
echo.
echo ✅ Mobile testing setup complete! 🎉
echo.
echo If you need to change the IP address later, edit:
echo   src\services\apiClient.ts (look for DEVELOPMENT_IP)

pause