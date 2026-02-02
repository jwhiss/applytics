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
    PointElement,
    LineElement,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import type { Application, ApplicationStats, AnalyticsData } from '../types/index';
import ActivityLogModal from './ActivityLogModal';
import type { HistoryItem } from '../types/index';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { getStatusBaseColor } from '../utils/statusColors';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement
);

interface Props {
    onEdit: (app: Application | null) => void;
}

export default function Dashboard({ onEdit }: Props) {
    const [stats, setStats] = useState<ApplicationStats | null>(null);
    const [recentActivity, setRecentActivity] = useState<(HistoryItem & { company: string; title: string })[]>([]);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [expandedCard, setExpandedCard] = useState<string | null>(null);

    useEffect(() => {
        let isMounted = true;

        async function loadData() {
            try {
                const [statsData, historyData] = await Promise.all([
                    window.electronAPI.getStats(),
                    window.electronAPI.getGlobalHistory()
                ]);

                // Fetch analytics data separately or together. 
                // Since it's potentially heavy, we could fetch it only when needed, 
                // but for now let's fetch it here to populate if expanded.
                const analytics = await window.electronAPI.getAnalytics();

                if (isMounted) {
                    setStats(statsData);
                    setRecentActivity(historyData);
                    setAnalyticsData(analytics);
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

    const renderExpandedChart = () => {
        if (!analyticsData || !expandedCard) return null;

        const commonOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top' as const,
                },
            },
        };

        switch (expandedCard) {
            case 'total-apps':
                return (
                    <div className="h-64">
                        <Line
                            data={{
                                labels: analyticsData.totalApplicationsOverTime.map(d => new Date(d.date).toLocaleDateString()),
                                datasets: [{
                                    label: 'Total Applications',
                                    data: analyticsData.totalApplicationsOverTime.map(d => d.count),
                                    borderColor: 'rgb(59, 130, 246)',
                                    backgroundColor: 'rgba(59, 130, 246, 0.5)',
                                    tension: 0.1
                                }]
                            }}
                            options={commonOptions}
                        />
                    </div>
                );
            case 'apps-per-week':
                return (
                    <div className="h-64">
                        <Bar
                            data={{
                                labels: analyticsData.appsPerWeek.map(d => d.week),
                                datasets: [{
                                    label: 'Applications per Week',
                                    data: analyticsData.appsPerWeek.map(d => d.count),
                                    backgroundColor: 'rgba(234, 88, 12, 0.6)',
                                    borderColor: 'rgba(234, 88, 12, 1)',
                                    borderWidth: 1
                                }]
                            }}
                            options={commonOptions}
                        />
                    </div>
                );
            case 'interview-rate':
                return (
                    <div className="h-64">
                        <Line
                            data={{
                                labels: analyticsData.interviewRateOverTime.map(d => d.month),
                                datasets: [{
                                    label: 'Interview Rate (%)',
                                    data: analyticsData.interviewRateOverTime.map(d => d.rate),
                                    borderColor: 'rgb(22, 163, 74)',
                                    backgroundColor: 'rgba(22, 163, 74, 0.5)',
                                    tension: 0.1
                                }]
                            }}
                            options={commonOptions}
                        />
                    </div>
                );
            case 'response-time':
                return (
                    <div className="h-64">
                        <Bar
                            data={{
                                labels: Object.keys(analyticsData.responseTimeDistribution),
                                datasets: [{
                                    label: 'Response Time Distribution',
                                    data: Object.values(analyticsData.responseTimeDistribution),
                                    backgroundColor: 'rgba(147, 51, 234, 0.6)',
                                    borderColor: 'rgba(147, 51, 234, 1)',
                                    borderWidth: 1
                                }]
                            }}
                            options={commonOptions}
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="p-6 space-y-6 relative">
            {/* Unified Overlay for Expanded Charts */}
            {expandedCard && analyticsData && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm transition-all duration-300"
                    onClick={() => setExpandedCard(null)}
                >
                    <div
                        className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-4xl p-6 relative animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside the modal
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-text-main">
                                {expandedCard === 'total-apps' && 'Total Applications'}
                                {expandedCard === 'apps-per-week' && 'Applications per Week'}
                                {expandedCard === 'interview-rate' && 'Interview Rate'}
                                {expandedCard === 'response-time' && 'Avg. Response Time'}
                            </h2>
                            <button
                                onClick={() => setExpandedCard(null)}
                                className="p-2 hover:bg-surface-hover rounded-full transition-colors"
                            >
                                <Minus className="w-6 h-6 text-text-muted rotate-45" /> {/* Close icon using Minus rotated */}
                            </button>
                        </div>
                        <div className="h-96 w-full">
                            {renderExpandedChart()}
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-text-main">Dashboard</h1>

                <button
                    onClick={() => onEdit(null)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                    New Application
                </button>
            </div>

            {/* Top Section: Metrics Grid + Status Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
                {/* Left Column: 2x2 Metrics Grid */}
                <div className="lg:col-span-2 grid grid-cols-2 gap-4">
                    {/* Use standard cards with click handlers */}
                    <div
                        className="glass-card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                        onClick={() => setExpandedCard('total-apps')}
                    >
                        <h2 className="text-xl font-semibold mb-4 text-text-main">Total Applications</h2>
                        <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">{stats.total}</div>
                        <p className="text-text-muted text-sm">Tracked across all time</p>
                    </div>

                    <div
                        className="glass-card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                        onClick={() => setExpandedCard('apps-per-week')}
                    >
                        <h2 className="text-xl font-semibold mb-4 text-text-main">Applications per Week</h2>
                        <div className="flex items-center gap-2">
                            <div className="text-5xl font-bold text-orange-600 dark:text-orange-400 mb-2">
                                {stats.recentActivityStats?.currentPeriodAvg ?? 0}
                            </div>
                            {(() => {
                                const trend = stats.recentActivityStats?.trend ?? 'neutral';
                                if (trend === 'up') return <TrendingUp className="w-10 h-10 text-green-500 mb-2" />;
                                if (trend === 'down') return <TrendingDown className="w-10 h-10 text-red-500 mb-2" />;
                                return <Minus className="w-10 h-10 text-text-muted mb-2" />;
                            })()}
                        </div>
                        <p className="text-text-muted text-sm">
                            For the last month
                            <br />
                            Prior month: {stats.recentActivityStats?.previousPeriodAvg ?? 0}/week
                        </p>
                    </div>

                    {/* Row 2 */}
                    <div
                        className="glass-card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                        onClick={() => setExpandedCard('interview-rate')}
                    >
                        <h2 className="text-lg font-semibold mb-2 text-text-main">Interview Rate</h2>
                        <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-1">
                            {stats.interviewRate.toFixed(1)}%
                        </div>
                        <p className="text-text-muted text-sm">Applications reaching interview</p>
                    </div>

                    <div
                        className="glass-card p-4 cursor-pointer hover:bg-surface-hover transition-colors"
                        onClick={() => setExpandedCard('response-time')}
                    >
                        <h2 className="text-lg font-semibold mb-2 text-text-main">Avg. Response Time</h2>
                        <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                            {stats.avgResponseTime !== null ? `${stats.avgResponseTime.toFixed(1)} Days` : 'N/A'}
                        </div>
                        <p className="text-text-muted text-sm">Excludes immediate updates</p>
                    </div>
                </div>

                {/* Right Column: Status Chart */}
                <div className="lg:col-span-2 grid grid-cols-1 gap-4">
                    <div className="glass-card p-6 flex flex-col">
                        <h2 className="text-xl font-semibold mb-4 text-text-main">Application Status</h2>
                        <div className="h-76 flex justify-center">
                            <Doughnut data={statusData} options={{ maintainAspectRatio: false }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section: Role Analysis & Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

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
