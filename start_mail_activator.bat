@echo off
title Passion Star - Trinh Kich Hoat Mail Tu Dong
chcp 65001 >nul
cd /d "%~dp0"
echo ==============================================================================
echo           PASSION STAR - AUTO MAIL ACTIVATOR SERVER (100%% SINGLE OPT-IN)
echo ==============================================================================
echo.
echo Dang khoi dong may chu noi bo...
echo Mo trinh duyet tai: http://localhost:3000/mail_activator.html
echo.

start "" "http://localhost:3000/mail_activator.html"

if exist "%APPDATA%\Antigravity\bin\agy-node.cmd" (
    "%APPDATA%\Antigravity\bin\agy-node.cmd" server.mjs
) else (
    node server.mjs
)

pause
