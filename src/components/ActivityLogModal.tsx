/**
 * @file ActivityLogModal.tsx
 * @description Modal displaying a log of recent activities across all applications.
 * Useful for reviewing recent updates at a glance.
 */

import { X } from 'lucide-react';
import type { HistoryItem } from '../types/index';

interface Props {
    history: (HistoryItem & { company: string; title: string })[];
    onClose: () => void;
}

export default function ActivityLogModal({ history, onClose }: Props) {
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-100">Activity Log</h2>
                    <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                        <X size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto p-0 flex-1">
                    {history.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No activity recorded yet.</div>
                    ) : (
                        <table className="w-full text-left text-sm text-slate-400">
                            <thead className="bg-slate-800/30 text-xs uppercase text-slate-300 sticky top-0 backdrop-blur-md">
                                <tr>
                                    <th className="px-6 py-3">Company</th>
                                    <th className="px-6 py-3">Action</th>
                                    <th className="px-6 py-3 text-right">Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {history.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-700/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-slate-200">{item.company}</td>
                                        <td className="px-6 py-4">
                                            Moved to <span className={`font-medium ${item.status === 'Offer' ? 'text-green-400' :
                                                item.status === 'Rejected' ? 'text-red-400' : 'text-blue-400'
                                                }`}>{item.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs">{new Date(item.date).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}
