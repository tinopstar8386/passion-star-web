@echo off
title Passion Star - Trinh Kich Hoat Mail Tu Dong
color 0E
cd /d "%~dp0.."
cls
echo ==============================================================================
echo           PASSION STAR - AUTO MAIL ACTIVATOR SERVER (100%% SINGLE OPT-IN)
echo ==============================================================================
echo.
echo Dang khoi dong may chu noi bo...
echo Mo trinh duyet tai: http://localhost:3000/mail_activator.html
echo.

start "" "http://localhost:3000/mail_activator.html"

if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
    call "%APPDATA%\Antigravity\bin\agy-node.cmd" server\server.mjs
    goto :done
)
where node >nul 2>&1
if %errorlevel%==0 (
    node server\server.mjs
    goto :done
)
if exist "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" (
    set "ELECTRON_RUN_AS_NODE=1"
    "%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe" server\server.mjs
    goto :done
)
if exist "%ProgramFiles%\nodejs\node.exe" (
    "%ProgramFiles%\nodejs\node.exe" server\server.mjs
    goto :done
)
if exist "%ProgramFiles%\Adobe\Adobe Creative Cloud Experience\libs\node.exe" (
    "%ProgramFiles%\Adobe\Adobe Creative Cloud Experience\libs\node.exe" server\server.mjs
    goto :done
)
if exist "%CommonProgramFiles%\Adobe\Creative Cloud Libraries\libs\node.exe" (
    "%CommonProgramFiles%\Adobe\Creative Cloud Libraries\libs\node.exe" server\server.mjs
    goto :done
)
echo [LOI] Khong tim thay Node.js hoac Antigravity tren may nay!

:done
pause
