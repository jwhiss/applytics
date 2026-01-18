/**
 * @file KanbanBoard.tsx
 * @description A drag-and-drop Kanban board for managing application states.
 * Columns represent different application statuses (Applied, Interview, Offer, etc.).
 */

import { useEffect, useState } from 'react';
import type { Application } from '../types/index';

const STATUSES = ['Applied', 'Online Assessment', 'Screening', 'Interview', 'Offer', 'Rejected', 'Online Assessment Expired', 'Withdrawn'];

interface Props {
    lastUpdated: number;
    onEdit: (app: Application) => void;
}

export default function KanbanBoard({ lastUpdated, onEdit }: Props) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadApplications();
    }, [lastUpdated]);

    async function loadApplications() {
        try {
            const data = await window.electronAPI.getApplications();
            setApplications(data);
        } finally {
            setLoading(false);
        }
    }

    const handleDragStart = (e: React.DragEvent, appId: number) => {
        e.dataTransfer.setData('appId', appId.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = async (e: React.DragEvent, status: string) => {
        e.preventDefault();
        const appId = parseInt(e.dataTransfer.getData('appId'), 10);

        // Optimistic update
        const app = applications.find(a => a.id === appId);
        const newStatus = status as Application['status'];

        if (app && app.status !== newStatus) {
            setApplications(prev => prev.map(a => a.id === appId ? { ...a, status: newStatus } : a));

            try {
                await window.electronAPI.updateApplication(appId, { status: newStatus });
            } catch (err) {
                console.error("Failed to update status", err);
                // Revert on failure
                loadApplications();
            }
        }
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="h-full overflow-x-auto p-6">
            <h1 className="text-3xl font-bold text-slate-100 mb-6">Pipeline Board</h1>
            <div className="flex gap-6 h-[calc(100vh-140px)] min-w-[1200px]">
                {STATUSES.map(status => {
                    const columnApps = applications.filter(a => a.status === status);

                    return (
                        <div
                            key={status}
                            className="flex-1 min-w-[280px] flex flex-col glass-card bg-slate-800/20"
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, status)}
                        >
                            <div className={`p-4 border-b border-slate-700/50 font-semibold flex justify-between items-center
                                ${status === 'Offer' ? 'text-green-400' :
                                    status === 'Rejected' ? 'text-red-400' : 'text-slate-200'}`}>
                                <span>{status}</span>
                                <span className="text-xs bg-slate-700/50 px-2 py-1 rounded-full text-slate-400">
                                    {columnApps.length}
                                </span>
                            </div>

                            <div className="flex-1 overflow-y-auto p-3 space-y-3">
                                {columnApps.map(app => (
                                    <div
                                        key={app.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, app.id)}
                                        onClick={() => onEdit(app)}
                                        className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 hover:border-blue-500/50 cursor-grab active:cursor-grabbing hover:bg-slate-700/50 transition-all shadow-sm group"
                                    >
                                        <div className="font-medium text-slate-200 group-hover:text-blue-400 transition-colors">
                                            {app.company}
                                        </div>
                                        <div className="text-sm text-slate-400 mt-1 truncate">
                                            {app.title}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-3 flex justify-between">
                                            <span>{new Date(app.date_applied).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
