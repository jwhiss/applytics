import type { HistoryItem } from '../types';

interface Props {
    history: HistoryItem[];
}

export default function Timeline({ history }: Props) {
    if (!history || history.length === 0) {
        return <div className="text-slate-500 text-sm italic">No history recorded yet.</div>;
    }

    return (
        <div className="relative border-l border-slate-700 ml-3 space-y-6">
            {history.map((item, index) => (
                <div key={item.id} className="relative pl-6">
                    {/* Dot */}
                    <div className={`absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 
            ${index === 0 ? 'bg-blue-500 border-blue-500 ring-4 ring-blue-500/20' : 'bg-slate-900 border-slate-600'}`}
                    />

                    <div className="flex flex-col">
                        <span className={`font-medium ${index === 0 ? 'text-blue-400' : 'text-slate-300'}`}>
                            {item.status}
                        </span>
                        <span className="text-xs text-slate-500">
                            {new Date(item.date).toLocaleString()}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
