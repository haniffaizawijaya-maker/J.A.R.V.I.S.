const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');

app.whenReady().then(() => {
    console.log('App ready');
    const win = new BrowserWindow({
        width: 1200,
        height: 750,
        center: true,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        show: true
    });

    win.loadFile(path.join(__dirname, 'public', 'floating.html'));
    
    win.webContents.on('did-finish-load', () => {
        console.log('Page loaded successfully');
    });

    win.webContents.on('did-fail-load', (e, code, desc) => {
        console.error('Page load failed:', code, desc);
    });

    win.on('show', () => console.log('Window shown event'));
    
    console.log('Window native handle:', win.getNativeWindowHandle().readInt32LE(0));

    globalShortcut.register('Alt+J', () => {
        console.log('ALT+J PRESSED!');
        if (win.isVisible()) win.hide();
        else win.show();
    });

    setTimeout(() => {
        console.log('Exiting test run after 3s...');
        app.quit();
    }, 3000);
});
