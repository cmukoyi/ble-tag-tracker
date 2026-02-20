# DEPLOY_PRODUCTION.ps1
# Production deployment script for BLE Tag Tracker

Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host "🚀 BLE Tag Tracker - Production Deployment" -ForegroundColor Green
Write-Host "=" -NoNewline -ForegroundColor Cyan
Write-Host ("=" * 59) -ForegroundColor Cyan
Write-Host ""

# Check if .env exists
if (-not (Test-Path "backend\.env")) {
    Write-Host "❌ ERROR: backend\.env file not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "📋 Setup Instructions:" -ForegroundColor Yellow
    Write-Host "   1. Copy backend\.env.example to backend\.env"
    Write-Host "   2. Edit backend\.env with your credentials"
    Write-Host "   3. Run this script again"
    Write-Host ""
    exit 1
}

Write-Host "✅ Environment file found" -ForegroundColor Green
Write-Host ""

# Check Python installation
$PYTHON = Get-Command python -ErrorAction SilentlyContinue
if (-not $PYTHON) {
    Write-Host "❌ ERROR: Python not found!" -ForegroundColor Red
    Write-Host "   Install Python 3.11+ from python.org" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Python found: $($PYTHON.Source)" -ForegroundColor Green
Write-Host ""

# Install/upgrade dependencies
Write-Host "📦 Installing production dependencies..." -ForegroundColor Yellow
& python -m pip install --upgrade pip
& python -m pip install -r backend\requirements.txt

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Get local IP for mobile access
$LocalIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -like "192.168.*" -or $_.IPAddress -like "10.*" }).IPAddress | Select-Object -First 1

Write-Host "🌍 Server Access URLs:" -ForegroundColor Cyan
Write-Host "   Desktop:  http://localhost:5000" -ForegroundColor White
if ($LocalIP) {
    Write-Host "   Mobile:   http://$($LocalIP):5000" -ForegroundColor Green
}
Write-Host ""

# Check if port 5000 is already in use
$PortInUse = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
if ($PortInUse) {
    Write-Host "⚠️  WARNING: Port 5000 is already in use!" -ForegroundColor Yellow
    Write-Host "   Stop the existing service or change PORT in backend\.env" -ForegroundColor Yellow
    Write-Host ""
    $Continue = Read-Host "Continue anyway? (y/N)"
    if ($Continue -ne 'y') {
        exit 1
    }
}

Write-Host "🔧 Production Mode Enabled" -ForegroundColor Green
Write-Host "   - Debug logging: DISABLED" -ForegroundColor Gray
Write-Host "   - Console logs: MINIMAL" -ForegroundColor Gray
Write-Host "   - Credentials: SECURED in .env" -ForegroundColor Gray
Write-Host ""

Write-Host "🚀 Starting production server..." -ForegroundColor Green
Write-Host ""
Write-Host "   Press Ctrl+C to stop the server" -ForegroundColor Gray
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""

# Navigate to backend and start server
Set-Location -Path "$PSScriptRoot\backend"
& python app.py

# Reset location on exit
Set-Location -Path $PSScriptRoot
