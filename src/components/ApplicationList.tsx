import { useEffect, useState, useMemo } from 'react';
import type { Application, HistoryItem } from '../types';
import ImportModal from './ImportModal';
import Timeline from './Timeline';
import { Search, ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react';

interface Props {
    onEdit: (app: Application | null) => void;
    onViewCompany: (company: string) => void;
    lastUpdated: number;
}

type SortField = 'company' | 'title' | 'status' | 'date_applied';
type SortDirection = 'asc' | 'desc';

// Helper to display date safely from YYYY-MM-DD string
function formatDate(dateStr: string) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString();
}

export default function ApplicationList({ onEdit, onViewCompany, lastUpdated }: Props) {
    const [applications, setApplications] = useState<Application[]>([]);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<{ field: SortField; direction: SortDirection }>({
        field: 'date_applied',
        direction: 'desc'
    });

    // Expandable Row State
    const [expandedAppId, setExpandedAppId] = useState<number | null>(null);
    const [expandedHistory, setExpandedHistory] = useState<HistoryItem[]>([]);

    async function toggleExpand(id: number) {
        if (expandedAppId === id) {
            setExpandedAppId(null);
            setExpandedHistory([]);
        } else {
            setExpandedAppId(id);
            // Fetch history for this app
            const history = await window.electronAPI.getHistory(id);
            setExpandedHistory(history);
        }
    }

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

    async function deleteApp(id: number) {
        if (confirm('Are you sure you want to delete this application?')) {
            await window.electronAPI.deleteApplication(id);
            loadApplications();
        }
    }

    const handleSort = (field: SortField) => {
        setSortConfig(current => ({
            field,
            direction: current.field === field && current.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const sortedAndFilteredApplications = useMemo(() => {
        let result = [...applications];

        // Filter
        if (searchQuery) {
            const lowerQuery = searchQuery.toLowerCase();
            result = result.filter(app =>
                app.company.toLowerCase().includes(lowerQuery) ||
                app.title.toLowerCase().includes(lowerQuery) ||
                app.status.toLowerCase().includes(lowerQuery)
            );
        }

        // Sort
        result.sort((a, b) => {
            const aValue = a[sortConfig.field];
            const bValue = b[sortConfig.field];

            if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [applications, searchQuery, sortConfig]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return <ArrowUpDown size={14} className="ml-1 text-slate-600" />;
        return sortConfig.direction === 'asc'
            ? <ChevronUp size={14} className="ml-1 text-blue-400" />
            : <ChevronDown size={14} className="ml-1 text-blue-400" />;
    };

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-6">
            <div className="flex flex-col gap-6 mb-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-slate-100">Applications</h1>
                    <div className="space-x-3">
                        <button
                            onClick={() => setIsImportOpen(true)}
                            className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Import Excel
                        </button>
                        <button
                            onClick={() => onEdit(null)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        >
                            Add Application
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search applications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left text-sm text-slate-400">
                    <thead className="bg-slate-800/50 text-xs uppercase text-slate-300">
                        <tr>
                            <th className="px-6 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('company')}>
                                <div className="flex items-center">Company <SortIcon field="company" /></div>
                            </th>
                            <th className="px-6 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('title')}>
                                <div className="flex items-center">Title <SortIcon field="title" /></div>
                            </th>
                            <th className="px-6 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('status')}>
                                <div className="flex items-center">Status <SortIcon field="status" /></div>
                            </th>
                            <th className="px-6 py-3 cursor-pointer hover:bg-slate-700/50 transition-colors" onClick={() => handleSort('date_applied')}>
                                <div className="flex items-center">Date Applied <SortIcon field="date_applied" /></div>
                            </th>
                            <th className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/50">
                        {sortedAndFilteredApplications.map((app) => (
                            <>
                                <tr key={app.id} className="hover:bg-slate-700/30 transition-colors">
                                    <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                                        <button
                                            onClick={() => toggleExpand(app.id)}
                                            className="p-1 hover:bg-slate-700 rounded transition-colors group"
                                        >
                                            <div className={`transition-transform duration-200 ${expandedAppId === app.id ? 'rotate-0' : '-rotate-90'}`}>
                                                <ChevronDown size={16} className="text-slate-500 group-hover:text-blue-400" />
                                            </div>
                                        </button>
                                        <button
                                            onClick={() => onViewCompany(app.company)}
                                            className="hover:text-blue-400 hover:underline text-left"
                                        >
                                            {app.company}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">{app.title}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                        ${app.status === 'Offer' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                                                app.status === 'Rejected' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                                                    app.status === 'Applied' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                                                        'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                                            {app.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{formatDate(app.date_applied)}</td>
                                    <td className="px-6 py-4 text-right space-x-2">
                                        <button onClick={() => onEdit(app)} className="text-blue-400 hover:text-blue-300 font-medium">Edit</button>
                                        <button onClick={() => deleteApp(app.id)} className="text-red-400 hover:text-red-300 font-medium">Delete</button>
                                    </td>
                                </tr>
                                {expandedAppId === app.id && (
                                    <tr className="bg-slate-800/30">
                                        <td colSpan={5} className="px-6 py-4 border-l-4 border-blue-500/50">
                                            <div className="flex gap-8">
                                                <div className="w-64 flex-shrink-0">
                                                    <h4 className="text-sm font-semibold text-slate-300 mb-3">Timeline</h4>
                                                    <Timeline history={expandedHistory} />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-semibold text-slate-300 mb-2">Notes</h4>
                                                    <p className="text-sm text-slate-400 whitespace-pre-wrap">
                                                        {app.notes || 'No notes added.'}
                                                    </p>

                                                    {app.outcome && (
                                                        <>
                                                            <h4 className="text-sm font-semibold text-slate-300 mt-4 mb-2">Outcome</h4>
                                                            <p className="text-sm text-slate-400">{app.outcome}</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </>
                        ))}
                        {sortedAndFilteredApplications.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                    {searchQuery ? 'No applications match your search.' : 'No applications found. Add one to get started!'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isImportOpen && (
                <ImportModal
                    onClose={() => setIsImportOpen(false)}
                    onImportComplete={() => {
                        loadApplications();
                        // Optionally trigger a stats reload via an event or prop if needed
                    }}
                />
            )}
        </div>
    );
}
