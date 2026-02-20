# START_SERVER.ps1
# PowerShell script to start the Vehicle Tracker backend server

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "🚀 Starting Vehicle Tracker Backend Server" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

# Use workspace venv (Flask already installed there)
$WORKSPACE_PYTHON = "C:\Users\Carlos Mukoyi\Documents\code\.venv\Scripts\python.exe"

# Navigate to backend directory
$BACKEND_DIR = "$PSScriptRoot\backend"
Set-Location -Path $BACKEND_DIR

Write-Host "🔧 Using workspace Python environment..." -ForegroundColor Yellow
Write-Host "   Python: $WORKSPACE_PYTHON" -ForegroundColor Cyan
Write-Host ""

# Start Flask server
Write-Host "🌐 Starting Flask server..." -ForegroundColor Green
Write-Host "   Desktop: http://localhost:5000" -ForegroundColor Cyan

# Get local IP address for mobile access
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" }).IPAddress | Select-Object -First 1
if ($LocalIP) {
    Write-Host "   Mobile:  http://$($LocalIP):5000" -ForegroundColor Green
}
Write-Host ""

& $WORKSPACE_PYTHON app.py
