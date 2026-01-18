import { useEffect, useState } from 'react';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import type { ApplicationStats } from '../types';
import ActivityLogModal from './ActivityLogModal';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

export default function Dashboard() {
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<(import('../types').HistoryItem & { company: string; title: string })[]>([]);
    const [showActivityModal, setShowActivityModal] = useState(false);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 5000);
        return () => clearInterval(interval);
    }, []);

    async function loadData() {
        const [statsData, historyData] = await Promise.all([
            window.electronAPI.getStats(),
            window.electronAPI.getGlobalHistory()
        ]);
        setStats(statsData);
        setRecentActivity(historyData);
    }

    if (!stats) return <div className="p-8">Loading...</div>;


    const statusData = {
        labels: stats.byStatus.map(s => s.status),
        datasets: [
            {
                label: '# of Applications',
                data: stats.byStatus.map(s => s.count),
                backgroundColor: stats.byStatus.map(s => {
                    switch (s.status) {
                        case 'Applied': return 'rgba(54, 162, 235, 0.6)'; // Blue
                        case 'Online Assessment': return 'rgba(6, 182, 212, 0.6)'; // Cyan
                        case 'Rejected': return 'rgba(255, 99, 132, 0.6)'; // Red
                        case 'Screening': return 'rgba(75, 192, 192, 0.6)'; // Green
                        case 'Interview': return 'rgba(153, 102, 255, 0.6)'; // Purple
                        case 'Offer': return 'rgba(255, 206, 86, 0.6)'; // Yellow
                        case 'Withdrawn': return 'rgba(201, 203, 207, 0.6)'; // Grey
                        case 'Online Assessment Expired': return 'rgba(249, 115, 22, 0.6)'; // Orange
                        default: return 'rgba(54, 162, 235, 0.6)'; // Default Blue
                    }
                }),
                borderColor: stats.byStatus.map(s => {
                    switch (s.status) {
                        case 'Applied': return 'rgba(54, 162, 235, 1)';
                        case 'Online Assessment': return 'rgba(6, 182, 212, 1)';
                        case 'Rejected': return 'rgba(255, 99, 132, 1)';
                        case 'Screening': return 'rgba(75, 192, 192, 1)';
                        case 'Interview': return 'rgba(153, 102, 255, 1)';
                        case 'Offer': return 'rgba(255, 206, 86, 1)';
                        case 'Withdrawn': return 'rgba(201, 203, 207, 1)';
                        case 'Online Assessment Expired': return 'rgba(249, 115, 22, 1)';
                        default: return 'rgba(54, 162, 235, 1)';
                    }
                }),
                borderWidth: 1,
            },
        ],
    };

    const keywordData = {
        labels: stats.byKeyword.map(k => k.keyword),
        datasets: [
            {
                label: 'Applications by Role',
                data: stats.byKeyword.map(k => k.count),
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1,
            },
        ],
    };

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Total Applications</h2>
                    <div className="text-5xl font-bold text-blue-400 mb-2">{stats.total}</div>
                    <p className="text-slate-400 text-sm">Tracked across all time</p>
                </div>

                <div className="glass-card p-6 lg:col-span-3">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-semibold text-slate-200">Recent Activity</h2>
                        {recentActivity.length > 0 && (
                            <button
                                onClick={() => setShowActivityModal(true)}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
                            >
                                View All Activity
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-slate-500">No recent activity.</p>
                        ) : (
                            recentActivity.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'Offer' ? 'bg-green-400' : 'bg-blue-400'}`} />
                                        <div>
                                            <span className="font-medium text-slate-200">{item.company}</span>
                                            <span className="mx-2 text-slate-500">•</span>
                                            <span className="text-slate-300">{item.status}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-500">{new Date(item.date).toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Application Status</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={statusData} options={{ maintainAspectRatio: false }} />
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-slate-200">Role Analysis</h2>
                    <div className="h-64">
                        {stats.byKeyword.length > 0 ? (
                            <Bar data={keywordData} options={{ maintainAspectRatio: false }} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-500">
                                No title data yet
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showActivityModal && (
                <ActivityLogModal
                    history={recentActivity}
                    onClose={() => setShowActivityModal(false)}
                />
            )}
        </div>
    );
}
