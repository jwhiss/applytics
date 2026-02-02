import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { initDB, getApplications, addApplication, updateApplication, deleteApplication, getStats, bulkUpsertApplications, getHistory, getGlobalHistory, getSettings, saveSetting, bulkUpdateStatus, getAnalytics } from './db/index';

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
        titleBarStyle: 'hiddenInset', // Mac-like style
        title: 'Applytics',
        icon: isDev ? path.join(__dirname, '../public/icon.png') : path.join(__dirname, '../dist/icon.png'),
    });

    if (isDev) {
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    initDB(); // Initialize DB
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });

    // Database setup placeholders (will be moved to db module)
    setupIPC();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

function setupIPC() {
    ipcMain.handle('get-applications', () => getApplications());
    ipcMain.handle('add-application', (_, app) => addApplication(app));
    ipcMain.handle('update-application', (_, { id, ...updates }) => updateApplication(id, updates));
    ipcMain.handle('delete-application', (_, id) => deleteApplication(id));
    ipcMain.handle('get-stats', () => getStats());
    ipcMain.handle('bulk-import', (_, apps) => bulkUpsertApplications(apps));
    ipcMain.handle('get-history', (_, id) => getHistory(id));
    ipcMain.handle('get-global-history', () => getGlobalHistory());
    ipcMain.handle('get-settings', () => getSettings());
    ipcMain.handle('save-setting', (_, { key, value }) => saveSetting(key, value));
    ipcMain.handle('bulk-update-status', (_, { oldStatus, newStatus }) => bulkUpdateStatus(oldStatus, newStatus));
    ipcMain.handle('get-analytics', () => getAnalytics());
}
