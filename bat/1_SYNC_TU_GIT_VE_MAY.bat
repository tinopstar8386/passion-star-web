@echo off
title Passion Star - Pull tu GitHub ve may
color 0A
cd /d "%~dp0.."
cls
echo ========================================================
echo    PASSION STAR - DONG BO CODE TU GITHUB VE MAY [PULL]
echo ========================================================
echo.
echo [*] Dang lay ma nguon moi nhat tu GitHub (origin main)...
echo.
git pull origin main
echo.
if %ERRORLEVEL% EQU 0 goto PULL_SUCCESS
goto PULL_FAILED

:PULL_SUCCESS
echo ========================================================
echo    [THANH CONG] Da cap nhat code moi nhat ve may!
echo ========================================================
goto PULL_END

:PULL_FAILED
echo ========================================================
echo    [THAT BAI] Co loi xay ra khi pull code tu GitHub.
echo    Vui long kiem tra ket noi mang hoac xung dot code.
echo ========================================================

:PULL_END
echo.
echo Bam phim bat ky de dong cua so nay...
pause >nul
