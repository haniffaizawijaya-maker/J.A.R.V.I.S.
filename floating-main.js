const { app, BrowserWindow, ipcMain, screen, session, globalShortcut } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('disable-logging');
app.commandLine.appendSwitch('log-level', '3');
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream');

let mainWindow;
let isExpanded = false;

const HUD_WIDTH = 750;
const HUD_HEIGHT = 700;

function createWindow() {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        callback(true);
    });

    session.defaultSession.setPermissionCheckHandler(() => true);

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize || primaryDisplay.bounds;

    mainWindow = new BrowserWindow({
        width: Math.min(1366, screenWidth - 40),
        height: Math.min(840, screenHeight - 40),
        center: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: false,
        resizable: true,
        hasShadow: true,
        show: true,
        icon: path.join(__dirname, 'jarvis_icon.ico'),
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'floating-preload.js')
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'public', 'floating.html'));
    mainWindow.setAlwaysOnTop(true, 'screen-saver');

    // Global Hotkeys: Alt+J, Ctrl+Space, Alt+X, F9
    const handleHotkey = (keyName) => {
        console.log(`[HOTKEY_TRIGGERED]: ${keyName}`);
        if (!mainWindow) return;
        if (mainWindow.isVisible()) {
            if (mainWindow.isMinimized()) {
                mainWindow.restore();
                mainWindow.focus();
            } else if (!mainWindow.isFocused()) {
                mainWindow.focus();
            } else {
                mainWindow.hide();
            }
        } else {
            mainWindow.show();
            mainWindow.restore();
            mainWindow.focus();
            mainWindow.setAlwaysOnTop(true, 'screen-saver');
        }
    };

    const shortcuts = ['Alt+J', 'CommandOrControl+Space', 'Alt+X', 'F9'];
    for (const sc of shortcuts) {
        try {
            const registered = globalShortcut.register(sc, () => handleHotkey(sc));
            console.log(`Register ${sc}: ${registered}`);
        } catch (err) {
            console.warn(`Failed to register ${sc}:`, err.message);
        }
    }
}

function toggleExpandState() {
    return true;
}

ipcMain.handle('toggle-expand', () => {
    return toggleExpandState();
});

ipcMain.handle('exec-command', async (event, commandText) => {
    return new Promise(async (resolve) => {
        try {
            const fetchRes = await fetch('http://localhost:3855/api/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: commandText })
            });
            const data = await fetchRes.json();
            resolve(data);
        } catch (err) {
            resolve({ success: false, responseText: 'Gagal menghubungi server inti Jarvis.' });
        }
    });
});

ipcMain.handle('close-app', () => {
    app.quit();
});

app.whenReady().then(createWindow);

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
