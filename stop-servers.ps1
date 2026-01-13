# Step Monsters - Stop All Servers Script

Write-Host "🛑 Stopping Step Monsters Servers..." -ForegroundColor Red
Write-Host ""

# Stop all background jobs
$jobs = Get-Job -ErrorAction SilentlyContinue
if ($jobs) {
    Write-Host "Stopping background jobs..." -ForegroundColor Yellow
    $jobs | Stop-Job
    $jobs | Remove-Job
    Write-Host "✅ All background jobs stopped" -ForegroundColor Green
} else {
    Write-Host "No background jobs found" -ForegroundColor Gray
}

# Stop any Node.js processes (backend)
Write-Host "Stopping Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    $nodeProcesses | Stop-Process -Force
    Write-Host "✅ Node.js processes stopped" -ForegroundColor Green
} else {
    Write-Host "No Node.js processes found" -ForegroundColor Gray
}

# Stop any Python HTTP server processes
Write-Host "Stopping Python HTTP server..." -ForegroundColor Yellow
$pythonProcesses = Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*http.server*" }
if ($pythonProcesses) {
    $pythonProcesses | Stop-Process -Force
    Write-Host "✅ Python HTTP server stopped" -ForegroundColor Green
} else {
    Write-Host "No Python HTTP server found" -ForegroundColor Gray
}

Write-Host ""
Write-Host "🎉 All Step Monsters servers have been stopped!" -ForegroundColor Green