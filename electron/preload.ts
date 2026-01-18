import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getApplications: () => ipcRenderer.invoke('get-applications'),
    addApplication: (app: any) => ipcRenderer.invoke('add-application', app),
    updateApplication: (id: number, updates: any) => ipcRenderer.invoke('update-application', { id, ...updates }),
    deleteApplication: (id: number) => ipcRenderer.invoke('delete-application', id),
    getStats: () => ipcRenderer.invoke('get-stats'),
    bulkImport: (apps: any[]) => ipcRenderer.invoke('bulk-import', apps),
    getHistory: (id: number) => ipcRenderer.invoke('get-history', id),
    getGlobalHistory: () => ipcRenderer.invoke('get-global-history'),
});
