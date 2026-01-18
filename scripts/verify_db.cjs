const { initDB, addApplication, getApplications, updateApplication, deleteApplication } = require('./dist-electron/db/index.js');
const path = require('path');
const { app } = require('electron');

// Mock electron app getPath if running outside electron (though we rely on default behaviour in our code)
// Our code: isDev ? local file : app.getPath...
// If we run this script with node, process.env.NODE_ENV is not set, so it might default to prod/dev?
// Let's set NODE_ENV=development to use local file.
process.env.NODE_ENV = 'development';

// Since our db code imports 'electron', running this with 'node' might fail if 'electron' module requires a running electron instance or if we are not in electron context.
// However, 'better-sqlite3' is native. 'electron' import is used for 'app.getPath'.
// If we mock 'app', we might get away with it.
// But we are importing a compiled JS file which has `require('electron')`.
// Let's try to run this with `electron` runner.

async function verify() {
    console.log('Initializing DB...');
    try {
        initDB();
    } catch (e) {
        console.error('InitDB failed:', e);
        // If it fails on app.getPath, we might need to be inside electron.
        // But in dev mode it uses process.cwd().
        // The issue is `import { app } from 'electron'` at top level.
        // If run with node, 'electron' package exports path to binary, not the API.
        // So this script MUST be run with `electron verify_db.js`.
    }

    console.log('Adding application...');
    const id = addApplication({
        company: 'Test Corp',
        title: 'Intern',
        status: 'Applied'
    });
    console.log('Added app with ID:', id);

    console.log('Fetching applications...');
    let apps = getApplications();
    console.log('Count:', apps.length);
    const app1 = apps.find(a => a.id === id);
    if (app1 && app1.company === 'Test Corp') {
        console.log('Verified add.');
    } else {
        console.error('Add failed.');
    }

    console.log('Updating application...');
    updateApplication(id, { status: 'Interview' });
    apps = getApplications();
    const app2 = apps.find(a => a.id === id);
    if (app2 && app2.status === 'Interview') {
        console.log('Verified update.');
    } else {
        console.error('Update failed.');
    }

    console.log('Deleting application...');
    deleteApplication(id);
    apps = getApplications();
    if (!apps.find(a => a.id === id)) {
        console.log('Verified delete.');
    } else {
        console.error('Delete failed.');
    }
}

verify().catch(console.error);
