@echo off
title J.A.R.V.I.S. AI Launcher
cd /d "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"

:: Start Node Server if not running
powershell -NoProfile -Command "if (-not (Get-Process node -ErrorAction SilentlyContinue | Where-Object { (Get-CimInstance Win32_Process -Filter ('ProcessId=' + $_.Id)).CommandLine -like '*server.js*' })) { Start-Process 'node.exe' -ArgumentList 'server.js' -WindowStyle Hidden }"

:: Start Electron Orb App
powershell -NoProfile -Command "if (-not (Get-Process electron -ErrorAction SilentlyContinue)) { Start-Process '.\node_modules\.bin\electron.cmd' -ArgumentList 'floating-main.js' -WindowStyle Hidden }"

exit
