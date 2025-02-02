/**
 * Skysplitter Desktop - Main Process
 * Version: 1.0.3
 * Author: Christian Gillinger
 * License: MIT
 */

const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');

// Register the asset protocol for secure file access
protocol.registerSchemesAsPrivileged([
  { scheme: 'asset', privileges: { secure: true, standard: true } }
]);

function createWindow() {
    // Determine the correct icon path based on whether we're in development or production
    const iconPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'assets/bluesky.png')
        : path.join(__dirname, 'assets/bluesky.png');

    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: iconPath
    });

    mainWindow.loadFile(path.join(__dirname, 'src/client/index.html'));
    
    // Uncomment the line below to open DevTools automatically
    // mainWindow.webContents.openDevTools();
}

app.whenReady().then(() => {
    // Register the asset protocol handler
    protocol.registerFileProtocol('asset', (request, callback) => {
        const url = request.url.substr(8);
        callback({ 
            path: path.normalize(
                app.isPackaged 
                    ? path.join(process.resourcesPath, url)
                    : path.join(__dirname, url)
            )
        });
    });

    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});
