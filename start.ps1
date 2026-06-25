Write-Host "========================================" -ForegroundColor Red
Write-Host "    تشغيل متجر روبلكس" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

# Kill any old node processes on port 3000
$oldProc = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
if ($oldProc) {
    Stop-Process -Id $oldProc -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

Set-Location -LiteralPath "$PSScriptRoot"

Write-Host "جاري تشغيل السيرفر..." -ForegroundColor Yellow
Write-Host ""
Write-Host "بعد التشغيل، افتح المتصفح على:" -ForegroundColor Cyan
Write-Host "  المتجر: http://localhost:3000" -ForegroundColor Green
Write-Host "  الإدارة: http://localhost:3000/admin" -ForegroundColor Green
Write-Host ""
Write-Host "اضغط Ctrl+C للإيقاف" -ForegroundColor Gray
Write-Host ""

node server.js

Read-Host "`nاضغط Enter للخروج"
