import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

let db: Database.Database;

export function initDB() {
    const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;
    // In dev, use local file. In prod, use userData directory.
    const dbPath = isDev
        ? path.join(process.cwd(), 'tracker.db')
        : path.join(app.getPath('userData'), 'tracker.db');

    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');

    createTables();
}

function createTables() {
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT DEFAULT 'Applied',
      date_applied TEXT DEFAULT CURRENT_TIMESTAMP,
      process_steps TEXT, -- JSON string array
      current_step_index INTEGER DEFAULT 0,
      outcome TEXT,
      notes TEXT,
      last_updated TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      date TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(application_id) REFERENCES applications(id) ON DELETE CASCADE
    );
  `;
    db.exec(createTableQuery);
}

// Application Types
export interface Application {
    id: number;
    company: string;
    title: string;
    status: string;
    date_applied: string;
    process_steps: string[]; // parsed from JSON
    current_step_index: number;
    outcome: string | null;
    notes: string;
    last_updated: string;
}

export interface HistoryItem {
    id: number;
    application_id: number;
    status: string;
    date: string;
}

// Helpers
export function getApplications(): Application[] {
    const stmt = db.prepare('SELECT * FROM applications ORDER BY last_updated DESC');
    const rows = stmt.all() as any[];
    return rows.map(row => ({
        ...row,
        process_steps: row.process_steps ? JSON.parse(row.process_steps) : [],
    }));
}

export function getHistory(applicationId: number): HistoryItem[] {
    const stmt = db.prepare('SELECT * FROM history WHERE application_id = ? ORDER BY date DESC');
    return stmt.all(applicationId) as HistoryItem[];
}

export function getGlobalHistory(): (HistoryItem & { company: string; title: string })[] {
    const stmt = db.prepare(`
        SELECT h.*, a.company, a.title 
        FROM history h
        JOIN applications a ON h.application_id = a.id
        ORDER BY h.date DESC
        LIMIT 10
    `);
    return stmt.all() as (HistoryItem & { company: string; title: string })[];
}

export function addApplication(app: Partial<Application>) {
    const stmt = db.prepare(`
    INSERT INTO applications (company, title, status, date_applied, process_steps, outcome, notes)
    VALUES (@company, @title, @status, @date_applied, @process_steps, @outcome, @notes)
  `);

    const status = app.status || 'Applied';
    const date = app.date_applied || new Date().toISOString();

    const transaction = db.transaction(() => {
        const info = stmt.run({
            company: app.company,
            title: app.title,
            status: status,
            date_applied: date,
            process_steps: JSON.stringify(app.process_steps || []),
            outcome: app.outcome || null,
            notes: app.notes || ''
        });

        const historyStmt = db.prepare('INSERT INTO history (application_id, status, date) VALUES (?, ?, ?)');
        historyStmt.run(info.lastInsertRowid, status, date); // Use app date for initial history

        return info.lastInsertRowid;
    });

    return transaction();
}

export function updateApplication(id: number, updates: Partial<Application>) {
    // Construct dynamic update query
    const fields = Object.keys(updates).filter(k => k !== 'id');
    if (fields.length === 0) return;

    // Check if status changed
    const currentApp = db.prepare('SELECT status FROM applications WHERE id = ?').get(id) as { status: string };

    const transaction = db.transaction(() => {
        const setClause = fields.map(k => `${k} = @${k}`).join(', ');
        const stmt = db.prepare(`
            UPDATE applications 
            SET ${setClause}, last_updated = CURRENT_TIMESTAMP
            WHERE id = @id
        `);

        const params = { ...updates, id };
        if (updates.process_steps) {
            (params as any).process_steps = JSON.stringify(updates.process_steps);
        }
        stmt.run(params);

        if (updates.status && updates.status !== currentApp.status) {
            const historyStmt = db.prepare('INSERT INTO history (application_id, status) VALUES (?, ?)');
            historyStmt.run(id, updates.status);
        }
    });

    transaction();
}

export function deleteApplication(id: number) {
    const stmt = db.prepare('DELETE FROM applications WHERE id = ?');
    stmt.run(id);
}

export function getStats() {
    const total = db.prepare('SELECT COUNT(*) as count FROM applications').get() as { count: number };
    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM applications GROUP BY status').all();

    // Keyword analysis
    const titles = db.prepare('SELECT title FROM applications').all() as { title: string }[];
    const keywords: Record<string, number> = {};
    // Common English stop words to exclude
    const stopWords = new Set(['and', 'or', 'the', 'in', 'at', 'of', 'for', 'with', 'a', 'an', 'to', 'on', 'by', 'sr', 'jr']);

    titles.forEach(({ title }) => {
        // Normalize: lowercase, replace non-alphanumeric (except standard letters) with spaces
        const words = title.toLowerCase()
            .replace(/[^\w\s]/g, ' ')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.has(w));

        words.forEach(word => {
            // Capitalize first letter for display
            const capitalized = word.charAt(0).toUpperCase() + word.slice(1);
            keywords[capitalized] = (keywords[capitalized] || 0) + 1;
        });
    });

    // Convert to array and sort by count (descending)
    const byKeyword = Object.entries(keywords)
        .map(([keyword, count]) => ({ keyword, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 keywords


    return {
        total: total.count,
        byStatus,
        byKeyword
    };
}

export function bulkUpsertApplications(apps: Partial<Application>[]) {
    const insert = db.prepare(`
        INSERT INTO applications (company, title, status, date_applied, process_steps, outcome, notes)
        VALUES (@company, @title, @status, @date_applied, @process_steps, @outcome, @notes)
    `);

    const update = db.prepare(`
        UPDATE applications 
        SET status = @status, 
            date_applied = @date_applied,
            process_steps = @process_steps,
            outcome = @outcome,
            notes = @notes,
            last_updated = CURRENT_TIMESTAMP
        WHERE id = @id
    `);

    const findExisting = db.prepare('SELECT id FROM applications WHERE company = ? AND title = ?');

    const transaction = db.transaction((applications: Partial<Application>[]) => {
        let added = 0;
        let updated = 0;

        for (const app of applications) {
            const existing = findExisting.get(app.company, app.title) as { id: number } | undefined;

            const appData = {
                company: app.company,
                title: app.title,
                status: app.status || 'Applied',
                date_applied: app.date_applied || new Date().toISOString(),
                process_steps: JSON.stringify(app.process_steps || []),
                outcome: app.outcome || null,
                notes: app.notes || ''
            };

            if (existing) {
                update.run({ ...appData, id: existing.id });
                updated++;
            } else {
                insert.run(appData);
                added++;
            }
        }
        return { added, updated };
    });

    return transaction(apps);
}
