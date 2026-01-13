# Start Step Monsters servers as PowerShell background jobs
Write-Host "Starting Step Monsters servers as background jobs..." -ForegroundColor Green

# Start PostgreSQL service
Write-Host "Starting PostgreSQL..." -ForegroundColor Yellow
Start-Service postgresql-x64-14 -ErrorAction SilentlyContinue

# Start backend server as background job
Write-Host "Starting backend server..." -ForegroundColor Yellow
$backendJob = Start-Job -Name "StepMonstersBackend" -ScriptBlock {
    Set-Location "C:\Users\$env:USERNAME\OneDrive - HLI Control\Documents\Projects\StepScientists\backend"
    npm run dev
}

# Start frontend server as background job
Write-Host "Starting frontend server..." -ForegroundColor Yellow  
$frontendJob = Start-Job -Name "StepMonstersFrontend" -ScriptBlock {
    Set-Location "C:\Users\$env:USERNAME\OneDrive - HLI Control\Documents\Projects\StepScientists"
    python -m http.server 8080
}

Write-Host ""
Write-Host "✅ Servers started as background jobs!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend Job ID: $($backendJob.Id)" -ForegroundColor Cyan
Write-Host "Frontend Job ID: $($frontendJob.Id)" -ForegroundColor Cyan
Write-Host ""
Write-Host "URLs:" -ForegroundColor White
Write-Host "  Backend: http://localhost:3000" -ForegroundColor Gray
Write-Host "  Frontend: http://localhost:8080" -ForegroundColor Gray
Write-Host "  Mobile App: http://192.168.1.111:3000/app" -ForegroundColor Gray
Write-Host ""
Write-Host "To check job status: Get-Job" -ForegroundColor Yellow
Write-Host "To stop jobs: .\stop-servers-powershell.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "Jobs will survive PC lock/unlock!" -ForegroundColor Green