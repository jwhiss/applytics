/**
 * @file Dashboard.tsx
 * @description Provides a visual analytics dashboard for job applications.
 * Displays summary cards, bar charts for activity over time, and a doughnut chart for status distribution.
 */

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
import type { ApplicationStats } from '../types/index';
import ActivityLogModal from './ActivityLogModal';
import type { HistoryItem } from '../types/index';

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
    const [recentActivity, setRecentActivity] = useState<(HistoryItem & { company: string; title: string })[]>([]);
    const [showActivityModal, setShowActivityModal] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                const [statsData, historyData] = await Promise.all([
                    window.electronAPI.getStats(),
                    window.electronAPI.getGlobalHistory()
                ]);
                if (isMounted) {
                    setStats(statsData);
                    setRecentActivity(historyData);
                }
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
        }

        loadData();
        const interval = setInterval(loadData, 5000);
        return () => {
            clearInterval(interval);
            isMounted = false;
        };
    }, []);

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
            <h1 className="text-3xl font-bold text-text-main">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="glass-card p-6 lg:col-span-1">
                    <h2 className="text-xl font-semibold mb-4 text-text-main">Total Applications</h2>
                    <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.total}</div>
                    <p className="text-text-muted text-sm">Tracked across all time</p>
                </div>

                <div className="glass-card p-6 lg:col-span-3">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-semibold text-text-main">Recent Activity</h2>
                        {recentActivity.length > 0 && (
                            <button
                                onClick={() => setShowActivityModal(true)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                View All Activity
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-text-muted">No recent activity.</p>
                        ) : (
                            recentActivity.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border shadow-sm">
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-2 h-2 rounded-full ${item.status === 'Offer' ? 'bg-green-500' : 'bg-blue-500'}`} />
                                        <div>
                                            <span className="font-medium text-text-main">{item.company}</span>
                                            <span className="mx-2 text-text-muted">•</span>
                                            <span className="text-text-muted">{item.status}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-text-muted">{new Date(item.date).toLocaleString()}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-text-main">Application Status</h2>
                    <div className="h-64 flex justify-center">
                        <Doughnut data={statusData} options={{ maintainAspectRatio: false }} />
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-text-main">Role Analysis</h2>
                    <div className="h-64">
                        {stats.byKeyword.length > 0 ? (
                            <Bar data={keywordData} options={{ maintainAspectRatio: false }} />
                        ) : (
                            <div className="h-full flex items-center justify-center text-text-muted">
                                Start applying to see your role analysis!
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
