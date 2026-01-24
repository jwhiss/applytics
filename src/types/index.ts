/**
 * @file index.ts
 * @description Defines TypeScript interfaces and types used throughout the application,
 * including Application data models, statistics, and history items.
 */

export interface Application {
    id: number;
    company: string;
    title: string;
    status: string;
    date_applied: string;
    process_steps: string[];
    current_step_index: number;
    outcome: string | null;
    notes: string;
    last_updated: string;
}

export interface ApplicationStats {
    total: number;
    byStatus: { status: string; count: number }[];
    byKeyword: { keyword: string; count: number }[];
}

export interface HistoryItem {
    id: number;
    application_id: number;
    status: string;
    date: string;
}

export interface IElectronAPI {
    getApplications: () => Promise<Application[]>;
    addApplication: (app: Partial<Application>) => Promise<number>;
    updateApplication: (id: number, updates: Partial<Application>) => Promise<void>;
    deleteApplication: (id: number) => Promise<void>;
    getStats: () => Promise<ApplicationStats>;
    bulkImport: (apps: Partial<Application>[]) => Promise<{ added: number; updated: number }>;
    getHistory: (id: number) => Promise<HistoryItem[]>;
    getGlobalHistory: () => Promise<(HistoryItem & { company: string; title: string })[]>;
    getSettings: () => Promise<Record<string, unknown>>;
    saveSetting: (key: string, value: unknown) => Promise<void>;
    bulkUpdateStatus: (oldStatus: string, newStatus: string) => Promise<void>;
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
