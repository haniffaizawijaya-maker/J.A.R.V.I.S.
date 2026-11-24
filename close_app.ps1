param([string]$appName)

$targetClean = $appName.Trim()
$lower = $targetClean.ToLower()

$processMap = @{
    'whatsapp' = @('WhatsApp', 'WhatsApp.Root', 'WhatsAppDesktop')
    'wa' = @('WhatsApp', 'WhatsApp.Root', 'WhatsAppDesktop')
    'spotify' = @('Spotify', 'SpotifyLauncher', 'SpotifyXboxGamebarWebView')
    'steam' = @('steam', 'steamwebhelper', 'steamservice')
    'discord' = @('Discord', 'DiscordCanary', 'DiscordPTB')
    'chrome' = @('chrome')
    'google' = @('chrome')
    'browser' = @('chrome', 'msedge')
    'edge' = @('msedge')
    'kalkulator' = @('CalculatorApp', 'calc')
    'calculator' = @('CalculatorApp', 'calc')
    'calc' = @('CalculatorApp', 'calc')
    'notepad' = @('Notepad')
    'catatan' = @('Notepad')
    'vscode' = @('Code')
    'code' = @('Code')
    'taskmgr' = @('Taskmgr')
    'task manager' = @('Taskmgr')
    'word' = @('WINWORD')
    'excel' = @('EXCEL')
    'powerpoint' = @('POWERPNT')
    'fortnite' = @('FortniteClient-Win64-Shipping', 'FortniteLauncher', 'EpicGamesLauncher')
    'valorant' = @('VALORANT', 'VALORANT-Win64-Shipping', 'RiotClientServices')
    'roblox' = @('RobloxPlayerBeta', 'Roblox')
    'point blank' = @('PointBlank', 'PB')
    'pointblank' = @('PointBlank', 'PB')
    'genshin' = @('GenshinImpact', 'launcher')
    'hoyoplay' = @('launcher')
    'scary teacher' = @('ScaryTeacher3D')
    'scary teacher 3d' = @('ScaryTeacher3D')
    'together after dark' = @('TogetherAfterDark')
    'sons of the forest' = @('SonsOfTheForest')
    'obs' = @('obs64', 'obs32')
}

$killed = $false

if ($processMap.ContainsKey($lower)) {
    $processesToKill = $processMap[$lower]
    foreach ($proc in $processesToKill) {
        $p = Get-Process -Name $proc -ErrorAction SilentlyContinue
        if ($p) {
            Stop-Process -Name $proc -Force -ErrorAction SilentlyContinue
            $killed = $true
            Write-Output "TERMINATED: $proc"
        }
    }
}

if (-not $killed) {
    # Fuzzy match process name or main window title
    $matches = Get-Process | Where-Object { 
        $_.ProcessName -like "*$targetClean*" -or 
        $_.MainWindowTitle -like "*$targetClean*" 
    }
    foreach ($m in $matches) {
        Stop-Process -Id $m.Id -Force -ErrorAction SilentlyContinue
        $killed = $true
        Write-Output "TERMINATED_FUZZY: $($m.ProcessName)"
    }
}

if ($killed) {
    exit 0
} else {
    Write-Output "NOT_FOUND: $appName"
    exit 1
}
