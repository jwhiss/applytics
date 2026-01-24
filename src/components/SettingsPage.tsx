import { useState } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { Moon, Sun, Plus, Trash2, RotateCcw } from 'lucide-react';

export default function SettingsPage() {
    const { theme, toggleTheme, statuses, addStatus, deleteStatus, bulkMigrateStatus, updateStatuses } = useSettings();
    const [newStatus, setNewStatus] = useState('');
    const [deleteData, setDeleteData] = useState<{ status: string; usageCount: number } | null>(null);
    const [migrateTarget, setMigrateTarget] = useState<string>('');

    const handleAddStatus = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newStatus.trim()) {
            await addStatus(newStatus.trim());
            setNewStatus('');
        }
    };

    const handleDeleteClick = async (status: string) => {
        // Check usage info from backend
        const apps = await window.electronAPI.getApplications();
        const count = apps.filter(app => app.status === status).length;

        if (count > 0) {
            setDeleteData({ status, usageCount: count });
            // Default migrate target to first available that isn't the one being deleted
            const available = statuses.filter(s => s !== status);
            if (available.length > 0) setMigrateTarget(available[0]);
        } else {
            // Safe to delete immediately
            if (confirm(`Are you sure you want to delete "${status}"?`)) {
                await deleteStatus(status);
            }
        }
    };

    const confirmDeleteWithMigration = async () => {
        if (!deleteData) return;

        if (migrateTarget) {
            await bulkMigrateStatus(deleteData.status, migrateTarget);
        }

        await deleteStatus(deleteData.status);
        setDeleteData(null);
    };

    const confirmDeleteWithoutMigration = async () => {
        if (!deleteData) return;
        // Just delete the status from the list, existing apps keep the string value but it won't be in the dropdown
        await deleteStatus(deleteData.status);
        setDeleteData(null);
    };

    const resetToDefaults = async () => {
        if (confirm('Are you sure you want to reset statuses to default? This will not change existing application statuses, but will reset the selection list.')) {
            const defaults = [
                'Applied',
                'Online Assessment',
                'Screening',
                'Interview',
                'Offer',
                'Rejected',
                'Online Assessment Expired',
                'Withdrawn'
            ];
            await updateStatuses(defaults);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div>
                <h1 className="text-3xl font-bold text-text-main mb-2">Settings</h1>
                <p className="text-text-muted">Manage application preferences and configurations.</p>
            </div>

            {/* Theme Section */}
            <section className="glass-card p-6">
                <h2 className="text-xl font-semibold text-text-main mb-4">Appearance</h2>
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="text-base font-medium text-text-main">Theme Mode</div>
                        <div className="text-sm text-text-muted">
                            Select your preferred interface appearance.
                        </div>
                    </div>

                    <button
                        onClick={toggleTheme}
                        className={`
              relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-300'}
            `}
                    >
                        <span
                            className={`
                inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-200 ease-in-out flex items-center justify-center
                ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
              `}
                        >
                            {theme === 'dark' ? (
                                <Moon size={14} className="text-blue-600" />
                            ) : (
                                <Sun size={14} className="text-yellow-500" />
                            )}
                        </span>
                    </button>
                </div>
            </section>

            {/* Status Configuration Section */}
            <section className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-text-main">Application Statuses</h2>
                        <p className="text-sm text-text-muted mt-1">
                            Customize the stages of your application process.
                        </p>
                    </div>
                    <button
                        onClick={resetToDefaults}
                        className="text-xs flex items-center space-x-1 text-text-muted hover:text-blue-500 transition-colors"
                        title="Reset to default list"
                    >
                        <RotateCcw size={14} />
                        <span>Reset Defaults</span>
                    </button>
                </div>

                {/* Add New Status */}
                <form onSubmit={handleAddStatus} className="flex space-x-2 mb-6">
                    <input
                        type="text"
                        value={newStatus}
                        onChange={(e) => setNewStatus(e.target.value)}
                        placeholder="Add new status (e.g., 'Phone Screen')..."
                        className="flex-1 glass-input px-4 py-2"
                    />
                    <button
                        type="submit"
                        disabled={!newStatus.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                    >
                        <Plus size={18} />
                        <span>Add</span>
                    </button>
                </form>

                {/* Status List */}
                <div className="space-y-2">
                    {statuses.map((status) => (
                        <div key={status} className="flex items-center justify-between p-3 bg-surface hover:bg-surface-hover rounded-lg group transition-colors">
                            <span className="font-medium text-text-main">{status}</span>
                            <button
                                onClick={() => handleDeleteClick(status)}
                                className="text-text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                title="Delete status"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            {/* Delete/Migrate Modal */}
            {deleteData && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="glass-card w-full max-w-md p-6 space-y-4">
                        <h3 className="text-lg font-bold text-text-main">Delete Status</h3>
                        <p className="text-text-muted">
                            The status <span className="font-semibold text-text-main">"{deleteData.status}"</span> is currently used by <span className="font-semibold text-text-main">{deleteData.usageCount}</span> applications.
                        </p>

                        <div className="space-y-4 pt-2">
                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="action"
                                        checked={!!migrateTarget}
                                        onChange={() => {
                                            const available = statuses.filter(s => s !== deleteData.status);
                                            if (available.length > 0) setMigrateTarget(available[0]);
                                        }}
                                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <span className="text-text-main">Migrate applications to:</span>
                                </label>
                                <select
                                    disabled={!migrateTarget}
                                    value={migrateTarget}
                                    onChange={(e) => setMigrateTarget(e.target.value)}
                                    className="mt-2 w-full glass-input px-3 py-2 text-sm disabled:opacity-50"
                                >
                                    {statuses.filter(s => s !== deleteData.status).map(s => (
                                        <option key={s} value={s} className="bg-background">{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                                <label className="flex items-center space-x-3 cursor-pointer">
                                    <input
                                        type="radio"
                                        name="action"
                                        checked={!migrateTarget}
                                        onChange={() => setMigrateTarget('')}
                                        className="text-blue-600 focus:ring-blue-500 h-4 w-4"
                                    />
                                    <span className="text-text-main">Keep existing usages</span>
                                </label>
                                <p className="text-xs text-text-muted mt-1 ml-7">
                                    Applications will retain the status "{deleteData.status}", but it will be removed from the dropdown for future selection.
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                            <button
                                onClick={() => setDeleteData(null)}
                                className="px-4 py-2 text-sm font-medium text-text-muted hover:bg-surface-hover rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={migrateTarget ? confirmDeleteWithMigration : confirmDeleteWithoutMigration}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors"
                            >
                                {migrateTarget ? 'Migrate & Delete' : 'Delete Only'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
