@echo off
cd /d "%~dp0.."
if exist "Passion2FA.exe" (
    start "" "Passion2FA.exe"
) else (
    echo [LOI] Khong tim thay file Passion2FA.exe!
    pause
)
