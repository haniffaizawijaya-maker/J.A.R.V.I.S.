const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const { exec } = require('child_process');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1300,
        height: 850,
        minWidth: 1000,
        minHeight: 700,
        title: "J.A.R.V.I.S. | Stark Industries OS",
        frame: true,
        backgroundColor: "#030a16",
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    // Load Jarvis UI
    mainWindow.loadURL('http://localhost:3855');

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Native Desktop App Launcher (Directly executed in user's GUI session)
ipcMain.handle('native-launch', async (event, target) => {
    return new Promise((resolve) => {
        const clean = (target || '').trim();
        console.log(`[Native Desktop Launcher] User requested: "${clean}"`);
        const lower = clean.toLowerCase();

        // 1. Web links
        if (lower.includes('youtube')) {
            shell.openExternal('https://www.youtube.com');
            return resolve({ success: true, message: 'Opening YouTube' });
        }
        if (lower.includes('google')) {
            shell.openExternal('https://www.google.com');
            return resolve({ success: true, message: 'Opening Google' });
        }
        if (clean.startsWith('http://') || clean.startsWith('https://')) {
            shell.openExternal(clean);
            return resolve({ success: true, message: `Opening ${clean}` });
        }

        // 2. Protocols or Windows Executables
        if (lower.includes('spotify')) {
            shell.openExternal('spotify:').catch(() => {
                exec('start spotify: || start https://open.spotify.com');
            });
            return resolve({ success: true, message: 'Opening Spotify' });
        }
        if (lower.includes('discord')) {
            shell.openExternal('discord:').catch(() => {
                exec('start discord:');
            });
            return resolve({ success: true, message: 'Opening Discord' });
        }
        if (lower.includes('steam')) {
            shell.openExternal('steam:').catch(() => {
                exec('start steam:');
            });
            return resolve({ success: true, message: 'Opening Steam' });
        }
        if (lower.includes('whatsapp') || lower.includes('wa')) {
            shell.openExternal('whatsapp:').catch(() => {
                exec('start https://web.whatsapp.com');
            });
            return resolve({ success: true, message: 'Opening WhatsApp' });
        }

        // 3. Native Windows system apps
        const sysApps = {
            'calc': 'calc.exe',
            'calculator': 'calc.exe',
            'kalkulator': 'calc.exe',
            'notepad': 'notepad.exe',
            'catatan': 'notepad.exe',
            'taskmgr': 'taskmgr.exe',
            'task manager': 'taskmgr.exe',
            'explorer': 'explorer.exe',
            'file explorer': 'explorer.exe',
            'cmd': 'cmd.exe',
            'terminal': 'wt.exe'
        };

        const exe = sysApps[lower] || clean;
        exec(`start ${exe}`, (err) => {
            if (err) {
                console.warn(`[Direct Exec Failed]: ${err.message}`);
                resolve({ success: false, error: err.message });
            } else {
                resolve({ success: true, message: `Opened ${exe}` });
            }
        });
    });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
