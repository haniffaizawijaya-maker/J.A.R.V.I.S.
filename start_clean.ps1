Set-Location "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"

# 1. Start Server if not already running
$nodeProc = Get-Process node -ErrorAction SilentlyContinue | Where-Object { 
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId = $($_.Id)" -ErrorAction SilentlyContinue).CommandLine
    $cmd -like "*server.js*"
}
if (-not $nodeProc) {
    Start-Process -FilePath "node.exe" -ArgumentList "server.js" -WorkingDirectory "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai" -WindowStyle Hidden
    Start-Sleep -Milliseconds 800
}

# 2. Start Electron if not running
$electronProc = Get-Process electron -ErrorAction SilentlyContinue
if (-not $electronProc) {
    Start-Process -FilePath ".\node_modules\.bin\electron.cmd" -ArgumentList "floating-main.js" -WorkingDirectory "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai" -WindowStyle Hidden
}
