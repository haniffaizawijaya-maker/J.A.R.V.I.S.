const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('jarvisNative', {
    launch: (target) => ipcRenderer.invoke('native-launch', target)
});
