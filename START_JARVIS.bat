@echo off
title J.A.R.V.I.S. Floating Siri Assistant
echo Starting J.A.R.V.I.S...
cd /d "%~dp0"
start "" /b node server.js
timeout /t 1 /nobreak >nul
start "" ".\node_modules\.bin\electron.cmd" floating-main.js
exit
