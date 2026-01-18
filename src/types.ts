export interface Application {
    id: number;
    company: string;
    title: string;
    status: 'Applied' | 'Online Assessment' | 'Screening' | 'Interview' | 'Offer' | 'Rejected' | 'Online Assessment Expired' | 'Withdrawn';
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
}

declare global {
    interface Window {
        electronAPI: IElectronAPI;
    }
}
