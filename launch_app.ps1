param([string]$target)

$targetClean = $target.Trim()
$lower = $targetClean.ToLower()

# Special Web URL Mapping
if ($lower -match '^(youtube|yt)$') {
    Start-Process "https://www.youtube.com"
    Write-Output "LAUNCHED_WEB: YouTube"
    exit 0
}
if ($lower -match '^(google|browser)$') {
    Start-Process "https://www.google.com"
    Write-Output "LAUNCHED_WEB: Google"
    exit 0
}
if ($targetClean -match '^(https?://|[a-zA-Z0-9-]+\.(com|org|net|id|co|io|app))') {
    $url = if ($targetClean -match '^https?://') { $targetClean } else { "https://$targetClean" }
    Start-Process $url
    Write-Output "LAUNCHED_URL: $url"
    exit 0
}

# 1. Check Desktop & Public Desktop for .url or .lnk (Games & Launchers)
$desktopDirs = @(
    "C:\Users\Public\Desktop",
    "$([Environment]::GetFolderPath('Desktop'))",
    "C:\Users\Hanif Faiza Wijaya\OneDrive\Desktop",
    "C:\Users\Hanif Faiza Wijaya\Desktop"
)

foreach ($dir in $desktopDirs) {
    if (Test-Path $dir) {
        $shortcut = Get-ChildItem -Path $dir -Include ("*$targetClean*.url", "*$targetClean*.lnk") -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($shortcut) {
            Start-Process "explorer.exe" -ArgumentList "`"$($shortcut.FullName)`""
            Write-Output "LAUNCHED_SHORTCUT: $($shortcut.Name)"
            exit 0
        }
    }
}

# 2. Check Programs Start Menu
$programDirs = @(
    "C:\ProgramData\Microsoft\Windows\Start Menu\Programs",
    "$([Environment]::GetFolderPath('Programs'))"
)
foreach ($pDir in $programDirs) {
    if (Test-Path $pDir) {
        $pShortcut = Get-ChildItem -Path $pDir -Recurse -Include ("*$targetClean*.lnk", "*$targetClean*.url") -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($pShortcut) {
            Start-Process "explorer.exe" -ArgumentList "`"$($pShortcut.FullName)`""
            Write-Output "LAUNCHED_STARTMENU: $($pShortcut.Name)"
            exit 0
        }
    }
}

# 3. Search in Windows Start Apps (UWP / Store Apps)
$app = Get-StartApps | Where-Object { $_.Name -like "*$targetClean*" } | Select-Object -First 1
if ($app) {
    if ($app.AppID.Contains("\") -or $app.AppID.Contains(":")) {
        Start-Process "$($app.AppID)"
    } else {
        Start-Process "explorer.exe" -ArgumentList "shell:AppsFolder\$($app.AppID)"
    }
    Write-Output "LAUNCHED_APP: $($app.Name)"
    exit 0
}

# 4. Try direct process execution
try {
    Start-Process $targetClean -ErrorAction Stop
    Write-Output "LAUNCHED_DIRECT: $targetClean"
    exit 0
} catch {}

# 5. Fallback cmd start
Start-Process "cmd.exe" -ArgumentList "/c start `"`" `"$targetClean`""
Write-Output "LAUNCHED_CMD: $targetClean"
