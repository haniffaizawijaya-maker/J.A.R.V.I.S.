@echo off
title J.A.R.V.I.S. Startup Bootstrapper
cd /d "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"

:: Check if server is running, if not start it silently
powershell -NoProfile -Command "if (-not (Get-Process node -ErrorAction SilentlyContinue | Where-Object { (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine -like '*server.js*' })) { Start-Process 'node.exe' -ArgumentList 'server.js' -WindowStyle Hidden }"

:: Wait briefly for server ready
timeout /t 2 /nobreak >nul

:: Check if electron HUD is running, if not start it
powershell -NoProfile -Command "if (-not (Get-Process electron -ErrorAction SilentlyContinue)) { Start-Process '.\node_modules\.bin\electron.cmd' -ArgumentList 'floating-main.js' -WindowStyle Hidden }"

exit
