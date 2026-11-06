@echo off
chcp 65001 >nul
title Khởi chạy Lightpanda Headless Browser (Port 9222)
echo ======================================================================
echo    LIGHTPANDA HEADLESS BROWSER LAUNCHER - PASSION STAR
echo    Sieu nhe, Zig-based (~10MB RAM vs 200MB+ Chrome)
echo ======================================================================
echo.

:: 1. Kiểm tra xem port 9222 đã có dịch vụ nào đang chạy chưa
netstat -ano | findstr :9222 >nul
if %errorlevel% == 0 (
    echo [OK] May chu CDP Port 9222 da dang chay!
    echo Lightpanda hoac CDP Server da san sang cho cac test va automation.
    echo.
    goto :TEST_CHECK
)

:: 2. Kiem tra Docker
where docker >nul 2>nul
if %errorlevel% == 0 (
    echo [DOCKER] Phat hien Docker! Dang kiem tra container lightpanda...
    docker ps -a --format "{{.Names}}" | findstr /i "^lightpanda$" >nul
    if %errorlevel% == 0 (
        echo [DOCKER] Dang khoi dong lai container 'lightpanda'...
        docker start lightpanda
    ) else (
        echo [DOCKER] Dang tai va khoi chay Lightpanda container tren cong 9222...
        docker run -d --name lightpanda -p 9222:9222 --restart unless-stopped lightpanda/browser:latest
    )
    timeout /t 2 >nul
    goto :TEST_CHECK
)

:: 3. Kiem tra WSL
where wsl >nul 2>nul
if %errorlevel% == 0 (
    echo [WSL] Docker khong kha dung, dang kiem tra WSL Linux...
    wsl which lightpanda >nul 2>nul
    if %errorlevel% == 0 (
        echo [WSL] Dang khoi chay Lightpanda server trong WSL tren cong 9222...
        start /b wsl lightpanda serve --port=9222
        timeout /t 2 >nul
        goto :TEST_CHECK
    ) else (
        echo [WSL] Lightpanda chua duoc cai trong WSL.
        echo Ban co the cai nhanh bang lenh trong WSL:
        echo   curl -fsSL https://pkg.lightpanda.io/install.sh ^| bash
        echo.
    )
)

echo [THONG BAO] Khong tim thay Docker hoac WSL voi Lightpanda da cai san.
echo.
echo ======================================================================
echo HUONG DAN CAI DAT LIGHTPANDA (Tiet kiem RAM gap 10-20 lan Chrome):
echo 1. Cach 1 (Khuyen dung tren Windows): Cai Docker Desktop va chay:
echo    docker run -d --name lightpanda -p 9222:9222 lightpanda/browser:latest
echo 2. Cach 2: Chay tren WSL2 Linux hoac macOS bang lenh:
echo    curl -fsSL https://pkg.lightpanda.io/install.sh ^| bash
echo    lightpanda serve --port=9222
echo.
echo * Luu y: He thong Antigravity da duoc tich hop co che Dual Fallback.
echo Neu chua bat Lightpanda, moi script se tu dong chay bang Chrome/Edge Headless
echo ma khong gay loi!
echo ======================================================================
echo.
pause
exit /b 0

:TEST_CHECK
echo.
echo [TEST] Kiem tra ket noi Lightpanda CDP tai http://127.0.0.1:9222/json/version:
powershell -Command "try { (Invoke-RestMethod -Uri 'http://127.0.0.1:9222/json/version' -TimeoutSec 2).Browser } catch { 'Chua ket noi duoc' }"
echo.
echo Lightpanda da san sang!
pause
