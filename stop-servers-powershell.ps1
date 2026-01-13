# Stop Step Monsters background jobs
Write-Host "Stopping Step Monsters servers..." -ForegroundColor Red

# Get and stop the jobs
$jobs = Get-Job -Name "StepMonsters*" -ErrorAction SilentlyContinue

if ($jobs) {
    foreach ($job in $jobs) {
        Write-Host "Stopping job: $($job.Name) (ID: $($job.Id))" -ForegroundColor Yellow
        Stop-Job $job
        Remove-Job $job
    }
    Write-Host "✅ All Step Monsters jobs stopped!" -ForegroundColor Green
} else {
    Write-Host "No Step Monsters jobs found running." -ForegroundColor Yellow
}

Write-Host ""