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
import type { Application, ApplicationStats } from '../types/index';
import ActivityLogModal from './ActivityLogModal';
import type { HistoryItem } from '../types/index';
import { getStatusBaseColor } from '../utils/statusColors';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
);

interface Props {
    onEdit: (app: Application | null) => void;
}

export default function Dashboard({ onEdit }: Props) {
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
                    const { r, g, b } = getStatusBaseColor(s.status);
                    return `rgba(${r}, ${g}, ${b}, 0.6)`;
                }),
                borderColor: stats.byStatus.map(s => {
                    const { r, g, b } = getStatusBaseColor(s.status);
                    return `rgba(${r}, ${g}, ${b}, 1)`;
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-main">Dashboard</h1>

                <button
                    onClick={() => onEdit(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    New Application
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4 text-text-main">Total Applications</h2>
                        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.total}</div>
                        <p className="text-text-muted text-sm">Tracked across all time</p>
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-2 text-text-main">Avg. Response Time</h2>
                        <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                            {stats.avgResponseTime !== null ? `${stats.avgResponseTime.toFixed(1)} Days` : 'N/A'}
                        </div>
                        <p className="text-text-muted text-xs">Excludes immediate updates</p>
                    </div>

                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-2 text-text-main">Interview Rate</h2>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                            {stats.interviewRate.toFixed(1)}%
                        </div>
                        <p className="text-text-muted text-xs">Applications reaching interview</p>
                    </div>
                </div>

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

                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <h2 className="text-xl font-semibold text-text-main">Recent Activity</h2>
                        {recentActivity.length > 0 && (
                            <button
                                onClick={() => setShowActivityModal(true)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium transition-colors"
                            >
                                View All
                            </button>
                        )}
                    </div>

                    <div className="space-y-3">
                        {recentActivity.length === 0 ? (
                            <p className="text-text-muted">No recent activity.</p>
                        ) : (
                            recentActivity.slice(0, 3).map((item) => (
                                <div key={item.id} className="p-3 bg-surface rounded-lg border border-border shadow-sm">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <div
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: `rgb(${getStatusBaseColor(item.status).r}, ${getStatusBaseColor(item.status).g}, ${getStatusBaseColor(item.status).b})` }}
                                        />
                                        <span className="font-medium text-text-main truncate block">{item.company}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-text-muted truncate max-w-[50%]">{item.status}</span>
                                        <span className="text-text-muted">{new Date(item.date).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))
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
