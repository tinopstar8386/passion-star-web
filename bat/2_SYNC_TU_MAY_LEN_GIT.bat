@echo off
title Passion Star - Auto Push len GitHub
color 0B
cd /d "%~dp0.."
cls
echo ========================================================
echo    PASSION STAR - AUTO SYNC TU MAY LEN GITHUB [PUSH]
echo ========================================================
echo.
echo [*] Buoc 1: Dang kiem tra va gom toan bo file thay doi...
git add -A
echo.

git diff-index --cached --quiet HEAD --
if %ERRORLEVEL% NEQ 0 goto DO_COMMIT
echo [*] Buoc 2: Khong co file moi nao can commit.
goto DO_PUSH

:DO_COMMIT
echo [*] Buoc 2: Dang tao commit tu dong...
git commit -m "chore: auto-sync local changes %DATE% %TIME%"
echo.

:DO_PUSH
echo [*] Buoc 3: Dang day toan bo code len GitHub (origin main)...
echo.
git push origin main
echo.
if %ERRORLEVEL% EQU 0 goto PUSH_SUCCESS
goto PUSH_FAILED

:PUSH_SUCCESS
echo ========================================================
echo    [THANH CONG] Da dong bo toan bo code len GitHub!
echo ========================================================
goto PUSH_END

:PUSH_FAILED
echo ========================================================
echo    [THAT BAI] Co loi xay ra khi day code len GitHub.
echo    Vui long kiem tra ket noi mang hoac xung dot code.
echo ========================================================

:PUSH_END
echo.
echo Bam phim bat ky de dong cua so nay...
pause >nul
