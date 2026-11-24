$shortcutDesktop = "C:\Users\Hanif Faiza Wijaya\OneDrive\Desktop\J.A.R.V.I.S. AI.lnk"
$startupDir = [System.Environment]::GetFolderPath('Startup')
$shortcutStartup = Join-Path $startupDir "JARVIS_AUTORUN.lnk"
$targetScript = "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai\start_clean.ps1"

$wsh = New-Object -ComObject WScript.Shell

# Desktop Shortcut
$sc1 = $wsh.CreateShortcut($shortcutDesktop)
$sc1.TargetPath = "powershell.exe"
$sc1.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$targetScript`""
$sc1.WorkingDirectory = "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"
$sc1.IconLocation = "shell32.dll,13"
$sc1.Save()

# Startup Shortcut
$sc2 = $wsh.CreateShortcut($shortcutStartup)
$sc2.TargetPath = "powershell.exe"
$sc2.Arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$targetScript`""
$sc2.WorkingDirectory = "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"
$sc2.Save()

Write-Output "Shortcuts successfully fixed!"
