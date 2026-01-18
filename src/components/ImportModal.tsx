import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { ArrowRight, Check, X, FileSpreadsheet, AlertCircle } from 'lucide-react';
import type { Application } from '../types/index';

interface Props {
    onClose: () => void;
    onImportComplete: () => void;
}


const AVAILABLE_FIELDS = [
    { label: 'Company Name', value: 'company' },
    { label: 'Job Title', value: 'title' },
    { label: 'Status', value: 'status' },
    { label: 'Date Applied', value: 'date_applied' },
    { label: 'Outcome / Notes', value: 'notes' },
    { label: 'Process Steps', value: 'process_steps' }, // Special handling maybe?
];

export default function ImportModal({ onClose, onImportComplete }: Props) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [file, setFile] = useState<File | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [previewData, setPreviewData] = useState<Partial<Application>[]>([]);
    const [importStats, setImportStats] = useState<{ added: number; updated: number } | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = e.target.files?.[0];
        if (!selected) return;


        setFile(selected);
        setHeaders([]);
        setRawData([]);
    };

    const parseFile = async () => {
        if (!file) return;

        try {
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            if (data.length > 0) {
                const headerRow = data[0] as string[];
                setHeaders(headerRow);
                setRawData(data.slice(1));

                const autoMap: Record<string, string> = {};
                headerRow.forEach(header => {
                    const normalized = String(header).toLowerCase();
                    if (normalized.includes('company')) autoMap[header] = 'company';
                    else if (normalized.includes('title') || normalized.includes('role')) autoMap[header] = 'title';
                    else if (normalized.includes('status')) autoMap[header] = 'status';
                    else if (normalized.includes('date')) autoMap[header] = 'date_applied';
                });
                setMapping(autoMap);
                setStep(2);
            } else {
                alert('File is empty.');
            }
        } catch (err: any) {
            console.error(err);
            alert('Failed to parse: ' + err.message);
        }
    };

    const handleMappingChange = (header: string, field: string) => {
        setMapping(prev => ({ ...prev, [header]: field }));
    };

    const processData = () => {
        const processed = rawData.map(row => {
            const app: any = {};
            headers.forEach((header, index) => {
                const field = mapping[header];
                if (field) {
                    let value = row[index];

                    // Basic data cleaning
                    if (field === 'date_applied' && typeof value === 'number') {
                        // Excel serial date to JS Date
                        value = new Date(Math.round((value - 25569) * 86400 * 1000)).toISOString();
                    }

                    app[field] = value;
                }
            });
            // Defaults
            if (!app.status) app.status = 'Applied';
            if (!app.date_applied) app.date_applied = new Date().toISOString();

            return app;
        }).filter(app => app.company && app.title); // Filter invalid rows

        setPreviewData(processed);
        setStep(3);
    };

    const runImport = async () => {
        setIsImporting(true);
        try {
            const result = await window.electronAPI.bulkImport(previewData);
            setImportStats(result);
        } catch (error) {
            console.error(error);
            alert('Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="glass-card w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50">
                    <h2 className="text-xl font-bold text-slate-100">Import Applications</h2>
                    {!importStats && (
                        <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X size={20} />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-auto p-6">
                    {/* Stepper */}
                    <div className="flex items-center justify-center mb-8 space-x-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>1</div>
                        <div className="w-12 h-1 bg-slate-700/50">
                            <div className={`h-full bg-blue-600 transition-all ${step >= 2 ? 'w-full' : 'w-0'}`} />
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>2</div>
                        <div className="w-12 h-1 bg-slate-700/50">
                            <div className={`h-full bg-blue-600 transition-all ${step >= 3 ? 'w-full' : 'w-0'}`} />
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400'}`}>3</div>
                    </div>

                    {step === 1 && (
                        <div
                            className={`text-center py-12 border-2 border-dashed rounded-xl transition-colors cursor-pointer ${file ? 'border-green-500 bg-green-500/10' : 'border-slate-600 hover:bg-slate-800/50'}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept=".xlsx,.csv" className="hidden" />
                            <FileSpreadsheet className={`w-16 h-16 mx-auto mb-4 ${file ? 'text-green-400' : 'text-slate-500'}`} />
                            {file ? (
                                <div>
                                    <p className="text-lg font-medium text-green-400">Selected: {file.name}</p>
                                    <p className="text-sm text-slate-400 mt-2">Click to change file</p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-lg font-medium text-slate-200">Click to upload Excel file</p>
                                    <p className="text-sm text-slate-400 mt-2">Supports .xlsx and .csv</p>
                                </div>
                            )}
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-200 mb-4">Map Columns</h3>
                            <p className="text-sm text-slate-400 mb-4">Match your Excel columns to the database fields.</p>

                            <div className="space-y-3">
                                {headers.map((header) => (
                                    <div key={header} className="flex items-center space-x-4 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                                        <span className="flex-1 font-medium text-slate-300 truncate">{header}</span>
                                        <ArrowRight className="text-slate-500" size={16} />
                                        <select
                                            className="flex-1 glass-input px-3 py-1 text-sm outline-none"
                                            value={mapping[header] || ''}
                                            onChange={(e) => handleMappingChange(header, e.target.value)}
                                        >
                                            <option value="">Skip Column</option>
                                            {AVAILABLE_FIELDS.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {step === 3 && !importStats && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-200">Preview Import</h3>

                            <div className="bg-blue-900/20 border border-blue-800 p-4 rounded-lg flex items-start gap-3">
                                <AlertCircle className="text-blue-400 mt-0.5" size={20} />
                                <div>
                                    <h4 className="font-medium text-blue-200">Import Strategy</h4>
                                    <p className="text-sm text-blue-300 mt-1">
                                        Applications matching <strong>Company</strong> and <strong>Job Title</strong> will be updated.
                                        Others will be created as new records.
                                    </p>
                                </div>
                            </div>

                            <p className="text-slate-300">
                                Ready to process <strong>{previewData.length}</strong> valid rows.
                            </p>

                            <div className="max-h-60 overflow-auto rounded-lg border border-slate-700">
                                <table className="w-full text-left text-sm text-slate-400">
                                    <thead className="bg-slate-800 text-slate-300 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-2">Company</th>
                                            <th className="px-4 py-2">Title</th>
                                            <th className="px-4 py-2">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                                        {previewData.slice(0, 10).map((row, i) => (
                                            <tr key={i}>
                                                <td className="px-4 py-2">{row.company}</td>
                                                <td className="px-4 py-2">{row.title}</td>
                                                <td className="px-4 py-2">{row.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {previewData.length > 10 && (
                                    <div className="p-2 text-center text-xs bg-slate-800/50 text-slate-500">
                                        ...and {previewData.length - 10} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {importStats && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check size={32} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-100 mb-2">Import Successful!</h3>
                            <div className="flex justify-center gap-8 mt-6">
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-slate-100">{importStats.added}</div>
                                    <div className="text-sm text-slate-400">New Records</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-slate-100">{importStats.updated}</div>
                                    <div className="text-sm text-slate-400">Updated Records</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-slate-700/50 bg-slate-800/50 flex justify-between">
                    {importStats ? (
                        <button onClick={() => { onImportComplete(); onClose(); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-colors">
                            Done
                        </button>
                    ) : (
                        <>
                            {step > 1 && (
                                <button
                                    onClick={() => setStep(s => (s - 1) as any)}
                                    className="px-4 py-2 text-slate-300 hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                            )}
                            <div className="flex-1" />
                            {step === 1 && (
                                <button
                                    onClick={parseFile}
                                    disabled={!file}
                                    className={`px-6 py-2 rounded-lg font-medium transition-colors ${file ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-500 cursor-not-allowed'}`}
                                >
                                    Next
                                </button>
                            )}
                            {step === 2 && (
                                <button
                                    onClick={processData}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                                >
                                    Next
                                </button>
                            )}
                            {step === 3 && (
                                <button
                                    onClick={runImport}
                                    disabled={isImporting}
                                    className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                                >
                                    {isImporting ? 'Importing...' : 'Start Import'}
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
