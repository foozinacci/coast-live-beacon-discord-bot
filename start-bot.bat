@echo off
title LIVE BEACON Bot
cd /d "%~dp0"

:loop
echo [%date% %time%] Starting LIVE BEACON bot...
node src/index.js
echo [%date% %time%] Bot stopped. Restarting in 5 seconds...
timeout /t 5 /nobreak >nul
goto loop
