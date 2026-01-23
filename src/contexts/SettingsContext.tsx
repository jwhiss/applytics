import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

// Default statuses if none exist in settings
const DEFAULT_STATUSES = [
    'Applied',
    'Online Assessment',
    'Screening',
    'Interview',
    'Offer',
    'Rejected',
    'Online Assessment Expired',
    'Withdrawn'
];

type Theme = 'light' | 'dark';

interface SettingsContextType {
    theme: Theme;
    toggleTheme: () => void;
    statuses: string[];
    addStatus: (status: string) => Promise<void>;
    updateStatuses: (newStatuses: string[]) => Promise<void>; // For reordering or simple list updates
    deleteStatus: (status: string) => Promise<void>;
    bulkMigrateStatus: (oldStatus: string, newStatus: string) => Promise<void>;
    loading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Theme>('dark');
    const [statuses, setStatuses] = useState<string[]>(DEFAULT_STATUSES);
    const [loading, setLoading] = useState(true);

    // Load settings on mount
    useEffect(() => {
        async function loadSettings() {
            try {
                const settings = await window.electronAPI.getSettings();

                if (settings.theme) {
                    setTheme(settings.theme);
                } else {
                    // Default to dark
                    setTheme('dark');
                }

                if (settings.statuses && Array.isArray(settings.statuses)) {
                    setStatuses(settings.statuses);
                } else {
                    // Initialize defaults in backend if not present? Or just keep local state default.
                    // Let's save the defaults to backend so they exist for future edits.
                    await window.electronAPI.saveSetting('statuses', DEFAULT_STATUSES);
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            } finally {
                setLoading(false);
            }
        }
        loadSettings();
    }, []);

    // Apply theme to body
    useEffect(() => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(theme);
    }, [theme]);

    const toggleTheme = async () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        await window.electronAPI.saveSetting('theme', newTheme);
    };

    const addStatus = async (status: string) => {
        if (statuses.includes(status)) return;
        const newStatuses = [...statuses, status];
        setStatuses(newStatuses);
        await window.electronAPI.saveSetting('statuses', newStatuses);
    };

    const updateStatuses = async (newStatuses: string[]) => {
        setStatuses(newStatuses);
        await window.electronAPI.saveSetting('statuses', newStatuses);
    };

    const deleteStatus = async (status: string) => {
        const newStatuses = statuses.filter(s => s !== status);
        setStatuses(newStatuses);
        await window.electronAPI.saveSetting('statuses', newStatuses);
    };

    const bulkMigrateStatus = async (oldStatus: string, newStatus: string) => {
        await window.electronAPI.bulkUpdateStatus(oldStatus, newStatus);
        // After migration, we might want to ensure the old status is definitely gone from the list?
        // It should already be handled by the caller calling deleteStatus, but strict order matters.
    };

    return (
        <SettingsContext.Provider value={{
            theme,
            toggleTheme,
            statuses,
            addStatus,
            updateStatuses,
            deleteStatus,
            bulkMigrateStatus,
            loading
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
