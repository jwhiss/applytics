/**
 * @file Timeline.tsx
 * @description Vertical timeline component for displaying application history events.
 * Renders a list of changes (status updates, notes, etc.) in reverse chronological order.
 */

import type { HistoryItem } from '../types/index';

interface Props {
    history: HistoryItem[];
}

export default function Timeline({ history }: Props) {
    if (!history || history.length === 0) {
        return <div className="text-text-muted text-sm italic">No history recorded yet.</div>;
    }

    return (
        <div className="relative border-l border-border ml-3 space-y-6">
            {history.map((item, index) => (
                <div key={item.id} className="relative pl-6">
                    {/* Dot */}
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 
            ${index === 0 ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-500/20' : 'bg-text-main border-text-muted'}`}
                    />

                    <div className="flex flex-col">
                        <span className={`font-medium ${index === 0 ? 'text-blue-400' : 'text-text-main'}`}>
                            {item.status}
                        </span>
                        <span className="text-xs text-text-muted">
                            {(() => {
                                const dateStr = item.date;
                                // If date is YYYY-MM-DD (length 10), parse as local date
                                if (dateStr.length === 10) {
                                    const [year, month, day] = dateStr.split('-').map(Number);
                                    return new Date(year, month - 1, day).toLocaleDateString();
                                }
                                return new Date(dateStr).toLocaleString();
                            })()}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
