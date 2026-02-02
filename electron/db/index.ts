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

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
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

interface ApplicationRow {
    id: number;
    company: string;
    title: string;
    status: string;
    date_applied: string;
    process_steps: string; // JSON string
    current_step_index: number;
    outcome: string | null;
    notes: string;
    last_updated: string;
}

// Helpers
export function getApplications(): Application[] {
    const stmt = db.prepare('SELECT * FROM applications ORDER BY last_updated DESC');
    const rows = stmt.all() as ApplicationRow[];
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

export function getSettings() {
    const stmt = db.prepare('SELECT * FROM settings');
    const rows = stmt.all() as { key: string; value: string }[];
    const settings: Record<string, unknown> = {};
    rows.forEach(row => {
        try {
            settings[row.key] = JSON.parse(row.value);
        } catch {
            settings[row.key] = row.value;
        }
    });
    return settings;
}

export function saveSetting(key: string, value: unknown) {
    const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, JSON.stringify(value));
}

export function bulkUpdateStatus(oldStatus: string, newStatus: string) {
    const transaction = db.transaction(() => {
        // Find all applications with oldStatus
        const apps = db.prepare('SELECT id FROM applications WHERE status = ?').all(oldStatus) as { id: number }[];

        if (apps.length === 0) return;

        // Update status for these apps
        const updateStmt = db.prepare('UPDATE applications SET status = ?, last_updated = CURRENT_TIMESTAMP WHERE status = ?');
        updateStmt.run(newStatus, oldStatus);

        // Add history entry for each
        const insertHistory = db.prepare('INSERT INTO history (application_id, status) VALUES (?, ?)');
        for (const app of apps) {
            insertHistory.run(app.id, newStatus);
        }
    });
    transaction();
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
            (params as Record<string, unknown>).process_steps = JSON.stringify(updates.process_steps);
        }
        stmt.run(params);

        const historyStmt = db.prepare('INSERT INTO history (application_id, status) VALUES (?, ?)');

        // If status changed, add new history item
        if (updates.status && updates.status !== currentApp.status) {
            historyStmt.run(id, updates.status);
        }

        if (updates.date_applied) {
            const updateHistoryDate = db.prepare(`
                UPDATE history 
                SET date = ? 
                WHERE id = (
                    SELECT id FROM history 
                    WHERE application_id = ? 
                    ORDER BY id ASC 
                    LIMIT 1
                )
            `);
            updateHistoryDate.run(updates.date_applied, id);
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

    // Calculate Interview Rate: % of apps that reached Interview, Offer, or Accepted
    // distinct application_ids in history with relevant statuses
    const interviewReached = db.prepare(`
        SELECT COUNT(DISTINCT application_id) as count 
        FROM history 
        WHERE status IN ('Interview', 'Offer', 'Accepted')
    `).get() as { count: number };

    const interviewRate = total.count > 0 ? (interviewReached.count / total.count) * 100 : 0;

    // Calculate Average Response Time
    // Time difference between date_applied and first status change to something meaningful
    // Meaningful = NOT 'Applied', 'Withdrawn', 'Online Assessment'
    const avgResponseTimeResult = db.prepare(`
        SELECT AVG(julianday(h.date) - julianday(a.date_applied)) as avgDays
        FROM applications a
        JOIN history h ON h.application_id = a.id
        WHERE h.id = (
            SELECT id FROM history h2
            WHERE h2.application_id = a.id
            AND h2.status NOT IN ('Applied', 'Withdrawn', 'Online Assessment')
            ORDER BY h2.date ASC
            LIMIT 1
        )
    `).get() as { avgDays: number | null };

    const avgResponseTime = avgResponseTimeResult.avgDays;

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




    // Weekly Activity Stats (Last 30 Days vs Prior 30 Days)
    const last30Count = db.prepare(`
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE julianday('now') - julianday(date_applied) <= 30
    `).get() as { count: number };

    const prior30Count = db.prepare(`
        SELECT COUNT(*) as count 
        FROM applications 
        WHERE julianday('now') - julianday(date_applied) > 30 
        AND julianday('now') - julianday(date_applied) <= 60
    `).get() as { count: number };

    const weeksInMonth = 30 / 7;
    const currentPeriodAvg = Number((last30Count.count / weeksInMonth).toFixed(1));
    const previousPeriodAvg = Number((prior30Count.count / weeksInMonth).toFixed(1));

    let trend: 'up' | 'down' | 'neutral' = 'neutral';
    if (currentPeriodAvg > previousPeriodAvg) trend = 'up';
    else if (currentPeriodAvg < previousPeriodAvg) trend = 'down';

    return {
        total: total.count,
        byStatus,
        byKeyword,
        avgResponseTime,
        interviewRate,
        recentActivityStats: {
            currentPeriodAvg,
            previousPeriodAvg,
            trend
        }
    };
}

export function getAnalytics() {
    // 1. Total Applications Over Time (Cumulative)
    // Group by date, ordered by date
    const dailyCounts = db.prepare(`
        SELECT date(date_applied) as date, COUNT(*) as count
        FROM applications
        GROUP BY date(date_applied)
        ORDER BY date(date_applied) ASC
    `).all() as { date: string; count: number }[];

    // Calculate cumulative sum
    let cumulative = 0;
    const totalApplicationsOverTime = dailyCounts.map(day => {
        cumulative += day.count;
        return { date: day.date, count: cumulative };
    });

    // 2. Applications Per Week
    // Group by Year-Week
    const appsPerWeek = db.prepare(`
        SELECT strftime('%Y-%W', date_applied) as week, COUNT(*) as count 
        FROM applications 
        GROUP BY week 
        ORDER BY week ASC
    `).all() as { week: string; count: number }[];


    // 3. Interview Rate Over Time (Monthly)
    // We need total apps vs apps that reached interview stage per month
    const monthlyStats = db.prepare(`
       SELECT 
            strftime('%Y-%m', a.date_applied) as month,
            COUNT(DISTINCT a.id) as total_apps,
            COUNT(DISTINCT CASE WHEN h.status IN ('Interview', 'Offer', 'Accepted') THEN a.id END) as interview_apps
        FROM applications a
        LEFT JOIN history h ON a.id = h.application_id
        GROUP BY month
        ORDER BY month ASC
    `).all() as { month: string; total_apps: number; interview_apps: number }[];

    const interviewRateOverTime = monthlyStats.map(m => ({
        month: m.month,
        rate: m.total_apps > 0 ? (m.interview_apps / m.total_apps) * 100 : 0
    }));

    // 4. Response Time Distribution
    // Bucket response times
    const responseTimes = db.prepare(`
        SELECT (julianday(h.date) - julianday(a.date_applied)) as days
        FROM applications a
        JOIN history h ON h.application_id = a.id
        WHERE h.id = (
            SELECT id FROM history h2
            WHERE h2.application_id = a.id
            AND h2.status NOT IN ('Applied', 'Withdrawn', 'Online Assessment')
            ORDER BY h2.date ASC
            LIMIT 1
        )
    `).all() as { days: number }[];

    const responseTimeDistribution: Record<string, number> = {
        '< 1 week': 0,
        '1-2 weeks': 0,
        '2-4 weeks': 0,
        '1+ month': 0
    };

    responseTimes.forEach(r => {
        const d = r.days;
        if (d < 7) responseTimeDistribution['< 1 week']++;
        else if (d < 14) responseTimeDistribution['1-2 weeks']++;
        else if (d < 30) responseTimeDistribution['2-4 weeks']++;
        else responseTimeDistribution['1+ month']++;
    });

    return {
        totalApplicationsOverTime,
        appsPerWeek,
        interviewRateOverTime,
        responseTimeDistribution
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
