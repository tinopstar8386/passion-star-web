@echo off
chcp 65001 >nul
title Passion Star - Auto Sync GitHub
color 0B

echo ========================================================
echo  ⭐ PASSION STAR - AUTO SYNC GITHUB (1-CLICK SYNC) ⭐
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Đang kiểm tra trạng thái Git...
git status -s > "%TEMP%\ps_git_status.tmp"

for %%R in ("%TEMP%\ps_git_status.tmp") do if %%~zR==0 (
    echo [i] Không có file nào thay đổi cục bộ. Đang đồng bộ từ GitHub về...
    git pull origin main
    echo.
    echo [OK] Mã nguồn đã hoàn toàn mới nhất và đồng bộ 100%% với GitHub!
    del "%TEMP%\ps_git_status.tmp" >nul 2>&1
    goto END
)

del "%TEMP%\ps_git_status.tmp" >nul 2>&1

echo [+] Phát hiện có thay đổi mã nguồn! Đang gom toàn bộ file...
git add -A

set "SYNC_TIME=%DATE% %TIME:~0,8%"
echo [+] Đang tạo commit tự động: auto-sync %SYNC_TIME%
git commit -m "chore(sync): auto-sync changes on %SYNC_TIME%"

echo.
echo [*] Đang đẩy toàn bộ dữ liệu lên GitHub (origin/main)...
git push origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  ✅ ĐÃ ĐỒNG BỘ TOÀN BỘ CODE LÊN GITHUB THÀNH CÔNG 100%%!
    echo ========================================================
) else (
    echo.
    echo ========================================================
    echo  ❌ CÓ LỖI XẢY RA TRONG QUÁ TRÌNH PUSH. VUI LÒNG KIỂM TRA MẠNG.
    echo ========================================================
)

:END
echo.
echo Bấm phím bất kỳ để thoát...
pause >nul
