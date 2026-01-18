/**
 * @file CompanyView.tsx
 * @description Detailed view for a specific company, showing all applications associated with it.
 * Includes aggregate statistics for that company.
 */

import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { Application } from '../types/index';

interface Props {
    companyName: string;
    onBack: () => void;
    onEdit: (app: Application) => void;
    lastUpdated: number;
}

// Helper to display date safely from YYYY-MM-DD string
function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
}

export default function CompanyView({ companyName, onBack, onEdit, lastUpdated }: Props) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadCompanyApplications();
    }, [companyName, lastUpdated]);

    async function loadCompanyApplications() {
        try {
            const data = await window.electronAPI.getApplications();
            // Filter locally for now, could be an API call if dataset grows
            setApplications(data.filter(app => app.company === companyName).sort((a, b) =>
                new Date(b.date_applied).getTime() - new Date(a.date_applied).getTime()
            ));
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <div className="p-8">Loading...</div>;

    const stats = {
        total: applications.length,
        active: applications.filter(a => ['Applied', 'Interviewing'].includes(a.status)).length,
        rejected: applications.filter(a => a.status === 'Rejected').length,
        offers: applications.filter(a => a.status === 'Offer').length,
    }

    return (
        <div className="p-6">
            <button
                onClick={onBack}
                className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
            >
                <ArrowLeft size={20} className="mr-2" />
                Back to Applications
            </button>

            <div className="flex items-end justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-slate-100 mb-2">{companyName}</h1>
                    <div className="flex gap-4 text-sm text-slate-400">
                        <span>Total Applications: <strong className="text-slate-200">{stats.total}</strong></span>
                        <span>•</span>
                        <span>Active: <strong className="text-blue-400">{stats.active}</strong></span>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800/50 text-xs uppercase text-slate-300">
                        <tr>
                            <th className="px-6 py-3">Title</th>
                            <th className="px-6 py-3">Status</th>
                            <th className="px-6 py-3">Date Applied</th>
                            <th className="px-6 py-3">Notes</th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {applications.map((app) => (
                            <tr key={app.id} className="hover:bg-slate-700/30 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-200">{app.title}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold
                    ${app.status === 'Offer' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                            app.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                app.status === 'Applied' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                    'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                        }`}>
                                        {app.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4">{formatDate(app.date_applied)}</td>
                                <td className="px-6 py-4 max-w-xs truncate">{app.notes || '-'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onEdit(app)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
