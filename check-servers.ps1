# Step Monsters - Check Server Status Script

Write-Host "🔍 Checking Step Monsters Server Status..." -ForegroundColor Cyan
Write-Host ""

# Check background jobs
Write-Host "Background Jobs:" -ForegroundColor White
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    $jobs | Format-Table Name, State, HasMoreData -AutoSize
} else {
    Write-Host "  No background jobs running" -ForegroundColor Gray
}

Write-Host ""

# Check Node.js processes (Backend)
Write-Host "Node.js Processes (Backend):" -ForegroundColor White
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Format-Table Id, ProcessName, CPU, WorkingSet -AutoSize
} else {
    Write-Host "  No Node.js processes found" -ForegroundColor Gray
}

Write-Host ""

# Check Python processes (Frontend)
Write-Host "Python Processes (Frontend):" -ForegroundColor White
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue
if ($pythonProcesses) {
    $pythonProcesses | Format-Table Id, ProcessName, CPU, WorkingSet -AutoSize
} else {
    Write-Host "  No Python processes found" -ForegroundColor Gray
}

Write-Host ""

# Test connectivity
Write-Host "Connectivity Tests:" -ForegroundColor White

# Test Backend
try {
    $backendResponse = Invoke-WebRequest -Uri "http://localhost:3000/health" -TimeoutSec 5 -UseBasicParsing
    if ($backendResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Backend (Port 3000): Running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Backend (Port 3000): Responding but status $($backendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Backend (Port 3000): Not responding" -ForegroundColor Red
}

# Test Frontend
try {
    $frontendResponse = Invoke-WebRequest -Uri "http://localhost:8080" -TimeoutSec 5 -UseBasicParsing
    if ($frontendResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Frontend (Port 8080): Running" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Frontend (Port 8080): Responding but status $($frontendResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Frontend (Port 8080): Not responding" -ForegroundColor Red
}

# Test Mobile App
try {
    $mobileResponse = Invoke-WebRequest -Uri "http://192.168.1.111:3000/app" -TimeoutSec 5 -UseBasicParsing
    if ($mobileResponse.StatusCode -eq 200) {
        Write-Host "  ✅ Mobile App: Accessible" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  Mobile App: Responding but status $($mobileResponse.StatusCode)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  ❌ Mobile App: Not accessible" -ForegroundColor Red
}

Write-Host ""

# Check PostgreSQL
Write-Host "PostgreSQL Service:" -ForegroundColor White
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService) {
    Write-Host "  Status: $($pgService.Status)" -ForegroundColor $(if ($pgService.Status -eq "Running") { "Green" } else { "Red" })
    Write-Host "  Service: $($pgService.Name)" -ForegroundColor Gray
} else {
    Write-Host "  ❌ PostgreSQL service not found" -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 Server Status Check Complete!" -ForegroundColor Cyan