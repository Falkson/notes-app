const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notes', {
  list:      ()         => ipcRenderer.invoke('notes:list'),
  save:      (data)     => ipcRenderer.invoke('notes:save', data),
  delete:    (filename) => ipcRenderer.invoke('notes:delete', filename),
  get:       (filename) => ipcRenderer.invoke('notes:get', filename),
  exportPDF: (data)     => ipcRenderer.invoke('notes:exportPDF', data)
});