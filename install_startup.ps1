$WshShell = New-Object -ComObject WScript.Shell
$startupFolder = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = Join-Path $startupFolder 'JARVIS_MK_LVII.lnk'

$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = 'C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai\autostart_jarvis.bat'
$shortcut.WorkingDirectory = 'C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai'
$shortcut.WindowStyle = 7
$shortcut.IconLocation = 'C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai\jarvis_icon.ico'
$shortcut.Description = 'J.A.R.V.I.S. AI Mark-LVII Autonomous Assistant'
$shortcut.Save()

Write-Host "Startup shortcut created successfully: $shortcutPath"
Write-Host "Exists: $(Test-Path $shortcutPath)"
