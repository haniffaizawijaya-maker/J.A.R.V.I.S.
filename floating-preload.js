const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingJarvis', {
    toggleExpand: () => ipcRenderer.invoke('toggle-expand'),
    closeApp: () => ipcRenderer.invoke('close-app'),
    execCommand: (cmd) => ipcRenderer.invoke('exec-command', cmd),
    onExpandToggled: (callback) => ipcRenderer.on('expand-changed', (event, expanded) => callback(expanded))
});

