const { app, BrowserWindow } = require('electron');
app.whenReady().then(() => {
    const win = new BrowserWindow({ width: 300, height: 300, frame: true, title: 'TEST_WINDOW' });
    win.loadURL('data:text/html,<h1>TEST</h1>');
    console.log('Window Created! Handle:', win.getNativeWindowHandle().readInt32LE(0));
    setTimeout(() => {
        console.log('Closing test...');
        app.quit();
    }, 4000);
});
