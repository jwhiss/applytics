
import { initDB, addApplication, updateApplication, getHistory, getApplications } from './electron/db/index';
import path from 'path';

// Mock app object for initDB
// We need to mock 'electron' module potentially or just ensure initDB works
// But initDB imports 'electron'. This makes it hard to run in node directly without mocking.
// We can just rely on the fact that initDB uses process.cwd() if isDev.

// Actually, better to copy the critical logic or use a modified db/index that mocks electron.
// Or, I can try to require it and mock electron.

const mockElectron = {
    app: {
        isPackaged: false,
        getPath: () => '/tmp'
    }
};

// We will use a separate test file that duplicates the logic to avoid import issues
// or just use `better-sqlite3` directly here to test the LOGIC.

import Database from 'better-sqlite3';

const dbPath = path.join(process.cwd(), 'tracker.db');
const db = new Database(dbPath);

function testHistory() {
    console.log('Opening DB at', dbPath);

    // 1. Create App
    const insert = db.prepare(`
        INSERT INTO applications (company, title, status, date_applied, process_steps, outcome, notes)
        VALUES (@company, @title, @status, @date_applied, @process_steps, @outcome, @notes)
    `);

    const info = insert.run({
        company: 'Test Corp',
        title: 'Tester',
        status: 'Applied',
        date_applied: new Date().toISOString(),
        process_steps: '[]',
        outcome: null,
        notes: ''
    });

    const id = info.lastInsertRowid as number;
    console.log('Created app with ID:', id);

    // 2. Initial History? 
    // The real addApplication inserts initial history. My manual insert above didn't. 
    // Let's manually insert initial history to match
    db.prepare('INSERT INTO history (application_id, status, date) VALUES (?, ?, ?)').run(id, 'Applied', new Date().toISOString());

    // 3. Update Status
    console.log('Updating status to Interview...');

    // Logic from updateApplication
    const updates = { status: 'Interview', id };
    const currentApp = db.prepare('SELECT status FROM applications WHERE id = ?').get(id) as { status: string };

    console.log(`Current: ${currentApp.status}, New: ${updates.status}`);

    if (updates.status && updates.status !== currentApp.status) {
        console.log('Status changed, inserting history...');
        db.prepare('INSERT INTO history (application_id, status) VALUES (?, ?)').run(id, updates.status);
    } else {
        console.log('Status NOT changed.');
    }

    // 4. Verify
    const history = db.prepare('SELECT * FROM history WHERE application_id = ?').all(id);
    console.log('History:', history);

    // Cleanup
    db.prepare('DELETE FROM applications WHERE id = ?').run(id);
    db.prepare('DELETE FROM history WHERE application_id = ?').run(id);
}

testHistory();
