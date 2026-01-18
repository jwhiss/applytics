/**
 * @file ApplicationForm.tsx
 * @description form component for creating or editing job application entries.
 * Handles validation and submission to the main process via IPC.
 */

import { useState, useEffect } from 'react';
import type { Application, HistoryItem } from '../types/index';
import { X, Save, Clock } from 'lucide-react';
import Timeline from './Timeline';

interface Props {
    initialData?: Application | null;
    onClose: () => void;
    onSave: () => void;
}

export default function ApplicationForm({ initialData, onClose, onSave }: Props) {
    const [formData, setFormData] = useState<Partial<Application>>({
        company: '',
        title: '',
        status: 'Applied',
        date_applied: (() => {
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const day = String(today.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        })(),
        outcome: '',
        notes: '',
    });

    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date_applied: initialData.date_applied.split('T')[0] // Format for input date
            });
            loadHistory(initialData.id);
        }
    }, [initialData]);

    async function loadHistory(id: number) {
        const data = await window.electronAPI.getHistory(id);
        setHistory(data);
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (initialData?.id) {
                await window.electronAPI.updateApplication(initialData.id, formData);
            } else {
                await window.electronAPI.addApplication(formData);
            }
            onSave();
            onClose();
        } catch (error) {
            console.error("Failed to save", error);
            alert('Failed to save application');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className={`glass-card w-full ${initialData ? 'max-w-4xl' : 'max-w-lg'} overflow-hidden flex flex-row`}>
                <div className="flex-1">
                    <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                        <h2 className="text-xl font-bold text-slate-100">
                            {initialData ? 'Edit Application' : 'New Application'}
                        </h2>
                        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Company</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 glass-input outline-none"
                                value={formData.company}
                                onChange={e => setFormData({ ...formData, company: e.target.value })}
                                placeholder="e.g. Google"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Job Title</label>
                            <input
                                required
                                type="text"
                                className="w-full px-3 py-2 glass-input outline-none"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                placeholder="e.g. Software Engineer Intern"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Status</label>
                                <select
                                    className="w-full px-3 py-2 glass-input outline-none"
                                    value={formData.status}
                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                >
                                    <option className="bg-slate-800" value="Applied">Applied</option>
                                    <option className="bg-slate-800" value="Online Assessment">Online Assessment</option>
                                    <option className="bg-slate-800" value="Screening">Screening</option>
                                    <option className="bg-slate-800" value="Interview">Interview</option>
                                    <option className="bg-slate-800" value="Offer">Offer</option>
                                    <option className="bg-slate-800" value="Rejected">Rejected</option>
                                    <option className="bg-slate-800" value="Online Assessment Expired">Online Assessment Expired</option>
                                    <option className="bg-slate-800" value="Withdrawn">Withdrawn</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Date Applied</label>
                                <input
                                    type="date"
                                    className="w-full px-3 py-2 glass-input outline-none"
                                    value={formData.date_applied}
                                    onChange={e => setFormData({ ...formData, date_applied: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">Outcome / Notes</label>
                            <textarea
                                className="w-full px-3 py-2 glass-input outline-none h-24 resize-none"
                                value={formData.notes}
                                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                                placeholder="Any additional notes..."
                            />
                        </div>

                        <div className="pt-4 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm flex items-center space-x-2 transition-transform active:scale-95"
                            >
                                <Save size={16} />
                                <span>Save Application</span>
                            </button>
                        </div>
                    </form>
                </div>

                {initialData && (
                    <div className="w-72 bg-slate-900/50 border-l border-slate-700/50 p-6">
                        <div className="flex items-center space-x-2 text-slate-200 mb-6">
                            <Clock size={18} className="text-blue-400" />
                            <h3 className="font-semibold">History</h3>
                        </div>
                        <Timeline history={history} />
                    </div>
                )}
            </div>
        </div>
    );
}
