const { app, globalShortcut } = require('electron');
app.whenReady().then(() => {
    const r1 = globalShortcut.register('Alt+J', () => console.log('1'));
    const r2 = globalShortcut.register('CommandOrControl+Space', () => console.log('2'));
    const r3 = globalShortcut.register('Alt+X', () => console.log('3'));
    const r4 = globalShortcut.register('F9', () => console.log('4'));
    console.log('HOTKEY_RESULT: Alt+J=' + r1 + ', Ctrl+Space=' + r2 + ', Alt+X=' + r3 + ', F9=' + r4);
    setTimeout(() => {
        globalShortcut.unregisterAll();
        app.quit();
    }, 1000);
});
