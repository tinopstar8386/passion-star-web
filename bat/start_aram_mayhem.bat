@echo off
cd /d "%~dp0.."
if exist "PassionMayhem.exe" (
    start "" "PassionMayhem.exe"
) else (
    echo [LOI] Khong tim thay file PassionMayhem.exe!
    pause
)
