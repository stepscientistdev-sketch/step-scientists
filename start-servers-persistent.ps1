# Step Monsters - Persistent Server Startup Script
# This script starts servers that will continue running even when PC is locked

Write-Host "🚀 Starting Step Monsters Servers (Persistent Mode)" -ForegroundColor Green
Write-Host "These servers will continue running even when your PC is locked" -ForegroundColor Yellow
Write-Host ""

# Function to start a persistent process
function Start-PersistentProcess {
    param(
        [string]$Name,
        [string]$Command,
        [string]$WorkingDirectory,
        [string]$LogFile
    )
    
    Write-Host "Starting $Name..." -ForegroundColor Cyan
    
    # Create a job that runs the process
    $job = Start-Job -Name $Name -ScriptBlock {
        param($cmd, $workDir, $logFile)
        
        Set-Location $workDir
        
        # Start the process and redirect output to log file
        $process = Start-Process -FilePath "cmd" -ArgumentList "/c", $cmd -NoNewWindow -PassThru -RedirectStandardOutput $logFile -RedirectStandardError "$logFile.error"
        
        # Keep the job alive by waiting for the process
        $process.WaitForExit()
        
    } -ArgumentList $Command, $WorkingDirectory, $LogFile
    
    Write-Host "✅ $Name started (Job ID: $($job.Id))" -ForegroundColor Green
    return $job
}

# Create logs directory
$logsDir = "logs"
if (!(Test-Path $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir | Out-Null
}

# Get current directory
$currentDir = Get-Location

# Start PostgreSQL (if not already running)
Write-Host "Checking PostgreSQL..." -ForegroundColor Cyan
$pgService = Get-Service -Name "postgresql*" -ErrorAction SilentlyContinue
if ($pgService -and $pgService.Status -ne "Running") {
    Write-Host "Starting PostgreSQL service..." -ForegroundColor Yellow
    Start-Service $pgService.Name
    Write-Host "✅ PostgreSQL started" -ForegroundColor Green
} elseif ($pgService) {
    Write-Host "✅ PostgreSQL already running" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL service not found - make sure it's installed" -ForegroundColor Yellow
}

Write-Host ""

# Start Backend Server
$backendJob = Start-PersistentProcess -Name "Backend" -Command "npm run dev" -WorkingDirectory "$currentDir\backend" -LogFile "$currentDir\logs\backend.log"

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server (Python HTTP server)
$frontendJob = Start-PersistentProcess -Name "Frontend" -Command "python -m http.server 8080" -WorkingDirectory $currentDir -LogFile "$currentDir\logs\frontend.log"

Write-Host ""
Write-Host "🎉 All servers started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Server Status:" -ForegroundColor White
Write-Host "- Backend API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Frontend: http://localhost:8080" -ForegroundColor Cyan
Write-Host "- Mobile App: http://192.168.1.111:3000/app" -ForegroundColor Cyan
Write-Host ""
Write-Host "Logs are being written to:" -ForegroundColor White
Write-Host "- Backend: logs\backend.log" -ForegroundColor Gray
Write-Host "- Frontend: logs\frontend.log" -ForegroundColor Gray
Write-Host ""
Write-Host "Job Management:" -ForegroundColor White
Write-Host "- View jobs: Get-Job" -ForegroundColor Gray
Write-Host "- Stop all: Get-Job | Stop-Job" -ForegroundColor Gray
Write-Host "- Remove jobs: Get-Job | Remove-Job" -ForegroundColor Gray
Write-Host ""
Write-Host "These servers will continue running even when you lock your PC!" -ForegroundColor Green
Write-Host "To stop them, run: Get-Job | Stop-Job" -ForegroundColor Yellow
Write-Host ""

# Keep the script running to monitor jobs
Write-Host "Monitoring servers... (Press Ctrl+C to exit monitoring, servers will continue running)" -ForegroundColor Magenta

try {
    while ($true) {
        Start-Sleep -Seconds 30
        
        # Check job status
        $jobs = Get-Job -Name "Backend", "Frontend" -ErrorAction SilentlyContinue
        $runningJobs = $jobs | Where-Object { $_.State -eq "Running" }
        
        if ($runningJobs.Count -lt 2) {
            Write-Host "⚠️  Some servers may have stopped. Check logs for details." -ForegroundColor Yellow
            Get-Job | Format-Table Name, State, HasMoreData
        }
    }
} catch {
    Write-Host ""
    Write-Host "Monitoring stopped. Servers are still running in background." -ForegroundColor Yellow
    Write-Host "Use 'Get-Job' to check status and 'Get-Job | Stop-Job' to stop them." -ForegroundColor Gray
}