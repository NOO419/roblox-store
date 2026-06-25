@echo off
chcp 65001 >nul
title متجر روبلكس - رابط عام
cd /d "%~dp0"

echo ========================================
echo    متجر روبلكس - رابط عام للإنترنت
echo ========================================
echo.

echo [1] جاري تشغيل السيرفر المحلي...
start /B "" node server.js > server.log 2>&1
if %errorlevel% neq 0 (
    echo ❌ فشل تشغيل السيرفر! تأكد من تثبيت Node.js
    pause
    exit /b
)
timeout /t 3 /nobreak >nul
echo ✅ تم تشغيل السيرفر على http://localhost:3000
echo.

echo [2] جاري إنشاء الرابط العام عبر serveo.net...
echo    (قد يطلب تأكيد الاتصال أول مرة - اكتب yes)
echo.

ssh -o StrictHostKeyChecking=no -R 80:localhost:3000 serveo.net 2>&1

pause
