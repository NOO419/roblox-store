@echo off
chcp 65001 >nul
title متجر روبلكس - رابط عام
cd /d "%~dp0"

echo ========================================
echo    متجر روبلكس - رابط عام للإنترنت
echo ========================================
echo.

echo [1] إيقاف أي سيرفر سابق...
taskkill /F /IM node.exe >nul 2>&1
timeout /t 2 /nobreak >nul

echo [2] تشغيل سيرفر المتجر...
start /B "" node server.js
timeout /t 4 /nobreak >nul

echo [3] جاري إنشاء الرابط العام من localhost.run...
echo    الرابط: http://localhost:3000
echo    الإدارة: http://localhost:3000/admin
echo.
echo    الرابط العام سيظهر أدناه (localhost.run):
echo ========================================
echo.

ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 nokey@localhost.run

pause
