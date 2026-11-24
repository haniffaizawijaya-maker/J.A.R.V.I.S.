$startupDir = [System.Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupDir "JARVIS_AUTORUN.lnk"
$wsh = New-Object -ComObject WScript.Shell
$sc = $wsh.CreateShortcut($shortcutPath)
$sc.TargetPath = "wscript.exe"
$sc.Arguments = "`"C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai\silent_start.vbs`""
$sc.WorkingDirectory = "C:\Users\Hanif Faiza Wijaya\.gemini\antigravity\scratch\jarvis-ai"
$sc.WindowStyle = 7
$sc.Save()
Write-Output "Startup updated: $shortcutPath"
