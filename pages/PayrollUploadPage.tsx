import React, { useState, useRef, useEffect, useCallback } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const EXPECTED_COLUMNS = [
    { key: 'staff_id', label: 'Staff Id', aliases: ['staffid', 'staff_id', 'employeeid', 'employee_id', 'id'] },
    { key: 'full_name', label: 'Full Name', aliases: ['fullname', 'full_name', 'name', 'staffname', 'staff_name', 'employee_name'] },
    { key: 'net_pay', label: 'Net Pay', aliases: ['netpay', 'net_pay', 'net', 'takehome', 'take_home'] },
    { key: 'pay_group', label: 'Pay Group', aliases: ['paygroup', 'pay_group', 'group'] },
    { key: 'sub_organization', label: 'Sub Organization', aliases: ['suborganization', 'sub_organization', 'mda', 'employer', 'organization', 'company'] },
    { key: 'staff_category', label: 'Staff Category', aliases: ['staffcategory', 'staff_category', 'category', 'level', 'staff_level'] },
    { key: 'gross_pay', label: 'Gross Pay', aliases: ['grosspay', 'gross_pay', 'gross'] },
    { key: 'location', label: 'Location', aliases: ['location', 'state', 'branch', 'city'] },
    { key: 'total_deductions', label: 'Total Deductions', aliases: ['totaldeductions', 'total_deductions', 'totaldeduct', 'totaldeducts', 'total_deducts', 'deductions', 'deducts'] }
];

interface PayrollUploadPageProps {
    user?: { name: string; email: string; avatar_url?: string; role?: string; isLoggedIn?: boolean };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

interface UploadSuccessData {
    success: boolean;
    message: string;
    organizationsProcessed: string[];
    recordsProcessed: number;
    recordsInserted: number;
}

interface PayrollRecord {
    id: string;
    staff_id: string;
    full_name: string;
    net_pay: number;
    pay_group: string;
    sub_organization: string;
    staff_category: string;
    gross_pay: number;
    location: string;
    total_deductions?: number;
    created_at: string;
}

const PayrollUploadPage: React.FC<PayrollUploadPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [viewMode, setViewMode] = useState<'upload' | 'view'>('upload');
    
    // Upload state
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [uploadStatus, setUploadStatus] = useState<string>('Uploading file...');
    const [successData, setSuccessData] = useState<UploadSuccessData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // View state
    const [searchQuery, setSearchQuery] = useState('');
    const [records, setRecords] = useState<PayrollRecord[]>([]);
    const [isLoadingRecords, setIsLoadingRecords] = useState(false);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);

    // Manual Record Modal State
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isSubmittingManual, setIsSubmittingManual] = useState(false);
    const [manualError, setManualError] = useState<string | null>(null);
    const [manualSuccess, setManualSuccess] = useState<string | null>(null);
    const [manualForm, setManualForm] = useState({
        staff_id: '',
        full_name: '',
        sub_organization: '',
        gross_pay: '',
        net_pay: '',
        total_deductions: '',
        pay_group: '',
        staff_category: '',
        location: ''
    });

    const isDark = theme === 'dark' || !theme;
    const limit = 15;

    // Allowed file types helper
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
    ];

    const validateFile = (selectedFile: File): boolean => {
        const fileExtension = selectedFile.name.split('.').pop()?.toLowerCase();
        const isValidExtension = ['xlsx', 'xls', 'csv'].includes(fileExtension || '');
        const isValidType = allowedTypes.includes(selectedFile.type) || selectedFile.type === '';

        if (!isValidExtension && !isValidType) {
            setError('Invalid file format. Please upload an Excel sheet (.xlsx, .xls) or a CSV file.');
            setFile(null);
            return false;
        }

        // 100MB limit
        if (selectedFile.size > 100 * 1024 * 1024) {
            setError('File size too large. Maximum allowed size is 100MB.');
            setFile(null);
            return false;
        }

        setError(null);
        setSuccessData(null);
        return true;
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const droppedFile = e.dataTransfer.files[0];
            if (validateFile(droppedFile)) {
                setFile(droppedFile);
            }
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (validateFile(selectedFile)) {
                setFile(selectedFile);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setSuccessData(null);
        setUploadProgress(0);
        setUploadStatus('Parsing file locally...');

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 2) {
                    setError('The sheet is empty or lacks data rows.');
                    setIsUploading(false);
                    return;
                }

                // 1. Identify the Header Row
                let headerRowIndex = -1;
                let maxMatches = 0;

                for (let i = 0; i < Math.min(20, data.length); i++) {
                    const rowVals = (data[i] as any[])
                        .filter(val => val !== undefined && val !== null)
                        .map(String)
                        .map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''));
                        
                    let matches = 0;
                    EXPECTED_COLUMNS.forEach(col => {
                        const cleanLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const cleanAliases = col.aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

                        if (rowVals.includes(cleanLabel) || cleanAliases.some(alias => rowVals.includes(alias))) {
                            matches++;
                        }
                    });

                    if (matches > maxMatches) {
                        maxMatches = matches;
                        headerRowIndex = i;
                    }
                }

                if (maxMatches === 0 || headerRowIndex === -1) {
                    setError("Could not detect standard payroll headers. Please ensure the file format is correct.");
                    setIsUploading(false);
                    return;
                }

                const headers = data[headerRowIndex] as string[];
                const rows = XLSX.utils.sheet_to_json(ws, { range: headerRowIndex });

                // Auto-map if names match approximately (ignoring spaces/case)
                const columnMap: Record<string, string> = {};
                EXPECTED_COLUMNS.forEach(col => {
                    const cleanLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const cleanAliases = col.aliases.map(a => a.toLowerCase().replace(/[^a-z0-9]/g, ''));

                    const match = headers.find(h => {
                        if (!h || typeof h !== 'string') return false;
                        const cleanHeader = h.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return cleanHeader === cleanLabel || cleanAliases.includes(cleanHeader);
                    });

                    if (match) columnMap[col.key] = match;
                });

                // Convert payload
                const payload = rows.map((row: any) => {
                    const mappedRecord: any = {};
                    EXPECTED_COLUMNS.forEach(field => {
                        const fileColumn = columnMap[field.key];
                        if (fileColumn && row[fileColumn] !== undefined) {
                            mappedRecord[field.key] = row[fileColumn];
                        }
                    });
                    return mappedRecord;
                });

                setUploadStatus('Uploading data...');

                // PostgreSQL limit is 65535 parameters per query.
                // We have 9 parameters per row. 65535 / 9 = 7281 max rows per query.
                // 7000 is the safe maximum for blazing fast bulk inserts.
                const BATCH_SIZE = 7000;
                const totalBatches = Math.ceil(payload.length / BATCH_SIZE);
                let totalInserted = 0;
                let orgsProcessed = new Set<string>();
                let hasError = false;

                for (let i = 0; i < totalBatches; i++) {
                    const batch = payload.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
                    
                    try {
                        const response = await axios.post('/api/staff/mda-payroll/upload-bulk-json', {
                            payrollData: batch,
                            isFirstBatch: i === 0
                        }, {
                            withCredentials: true,
                        });
                        
                        if (response.data?.success) {
                            totalInserted += (response.data.recordsInserted || 0);
                            if (response.data.organizationsProcessed) {
                                response.data.organizationsProcessed.forEach((o: string) => orgsProcessed.add(o));
                            }
                        } else {
                            setError(response.data?.message || 'Error processing batch.');
                            hasError = true;
                            break;
                        }

                        setUploadProgress(Math.round(((i + 1) / totalBatches) * 100));
                        setUploadStatus(`Inserting rows… ${Math.min((i + 1) * BATCH_SIZE, payload.length).toLocaleString()} / ${payload.length.toLocaleString()}`);

                    } catch (err: any) {
                        console.error('Import batch error:', err);
                        if (err.response?.status === 403) {
                            setError('Access Denied. You must be logged in as an authorized staff member to upload payroll sheets.');
                        } else {
                            setError(err.response?.data?.message || err.message || 'An error occurred while uploading the payroll file.');
                        }
                        hasError = true;
                        break;
                    }
                }

                if (!hasError) {
                    setSuccessData({
                        success: true,
                        message: "MDA payroll sheet uploaded and processed successfully.",
                        organizationsProcessed: Array.from(orgsProcessed),
                        recordsProcessed: payload.length,
                        recordsInserted: totalInserted
                    });
                    setUploadProgress(100);
                    setUploadStatus('Complete!');
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                }
                
                setIsUploading(false);

            } catch (err: any) {
                setError('Failed to parse Excel file. Ensure it is a valid .xlsx, .xls, or .csv.');
                setIsUploading(false);
            }
        };

        reader.readAsBinaryString(file);
    };

    const clearFile = () => {
        setFile(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const fetchRecords = useCallback(async (pageNum: number, search: string) => {
        setIsLoadingRecords(true);
        try {
            const response = await axios.get('/api/staff/mda-payroll', {
                params: { page: pageNum, limit, search },
                withCredentials: true
            });
            if (response.data.success) {
                setRecords(response.data.records);
                setTotalRecords(response.data.total);
            }
        } catch (error) {
            console.error("Failed to fetch records", error);
        } finally {
            setIsLoadingRecords(false);
        }
    }, [limit]);

    useEffect(() => {
        if (viewMode === 'view') {
            const timeoutId = setTimeout(() => {
                fetchRecords(page, searchQuery);
            }, 300); // debounce search
            return () => clearTimeout(timeoutId);
        }
    }, [viewMode, page, searchQuery, fetchRecords]);

    const formatMoney = (amount: number) => {
        return new Intl.NumberFormat('en-NG', {
            style: 'currency',
            currency: 'NGN',
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // Manual record form submission
    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingManual(true);
        setManualError(null);
        setManualSuccess(null);

        // Simple validation
        if (!manualForm.staff_id || !manualForm.full_name || !manualForm.sub_organization || !manualForm.gross_pay || !manualForm.net_pay) {
            setManualError("Please fill in all required fields.");
            setIsSubmittingManual(false);
            return;
        }

        try {
            const response = await axios.post('/api/staff/mda-payroll/manual', {
                ...manualForm,
                gross_pay: Number(manualForm.gross_pay),
                net_pay: Number(manualForm.net_pay),
                total_deductions: manualForm.total_deductions ? Number(manualForm.total_deductions) : undefined
            }, {
                withCredentials: true
            });

            if (response.data.success) {
                setManualSuccess("Payroll record saved successfully!");
                // Clear form
                setManualForm({
                    staff_id: '',
                    full_name: '',
                    sub_organization: '',
                    gross_pay: '',
                    net_pay: '',
                    total_deductions: '',
                    pay_group: '',
                    staff_category: '',
                    location: ''
                });
                
                // Refresh data if in view mode
                fetchRecords(page, searchQuery);
                
                // Close modal after a short delay
                setTimeout(() => {
                    setIsManualModalOpen(false);
                    setManualSuccess(null);
                }, 1500);
            }
        } catch (err: any) {
            console.error("Failed to add manual record:", err);
            setManualError(err.response?.data?.message || err.message || "An error occurred while saving the record.");
        } finally {
            setIsSubmittingManual(false);
        }
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className={`min-h-[80vh] -m-8 p-10 font-sans relative overflow-x-hidden transition-colors duration-500 ${isDark ? 'bg-[#060b13] text-slate-300' : 'bg-[#f8fafc] text-slate-600'}`}>
                
                {/* Header */}
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <span className="material-symbols-outlined text-3xl text-blue-500">
                                {viewMode === 'upload' ? 'upload_file' : 'folder_open'}
                            </span>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                                {viewMode === 'upload' ? 'MDA Payroll Upload' : 'Payroll Directory'}
                            </h1>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium mt-2">
                            {viewMode === 'upload' 
                                ? 'Upload the latest payroll schedule sheets to update the staff payroll directory records.' 
                                : 'Search and view all uploaded staff payroll directory records in the system.'}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {viewMode === 'view' && (
                            <button
                                onClick={() => setIsManualModalOpen(true)}
                                className="px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide flex items-center gap-2 transition-all shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                                Add Record
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setViewMode(viewMode === 'upload' ? 'view' : 'upload');
                                if (viewMode === 'upload') setPage(1); // Reset page on switch to view
                            }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide flex items-center gap-2 transition-all shadow-sm ${
                                isDark 
                                    ? 'bg-[#111827] hover:bg-slate-800 text-white border border-slate-700/50' 
                                    : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200'
                            }`}
                        >
                            <span className="material-symbols-outlined text-[20px]">
                                {viewMode === 'upload' ? 'format_list_bulleted' : 'cloud_upload'}
                            </span>
                            {viewMode === 'upload' ? 'View All Records' : 'Upload New Sheet'}
                        </button>
                    </div>
                </motion.div>

                <AnimatePresence mode="wait">
                    {viewMode === 'upload' ? (
                        <motion.div
                            key="upload-view"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.3 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            {/* Left Column: Dropzone and actions */}
                            <div className="lg:col-span-2 space-y-6">
                                <div
                                    className={`p-8 rounded-3xl border transition-all ${
                                        isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
                                    }`}
                                >
                                    <h2 className="text-sm font-black text-slate-800 dark:text-white mb-6 uppercase tracking-wider">
                                        Upload Sheet File
                                    </h2>

                                    {/* Dropzone area */}
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        className={`group border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all ${
                                            isDragging
                                                ? 'border-blue-500 bg-blue-500/5 shadow-[0_0_20px_rgba(59,130,246,0.15)]'
                                                : file
                                                ? 'border-emerald-500/50 bg-emerald-500/5'
                                                : isDark
                                                ? 'border-slate-800 hover:border-slate-700 bg-slate-900/10 hover:bg-slate-900/30'
                                                : 'border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100/50'
                                        } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileSelect}
                                            accept=".xlsx, .xls, .csv"
                                            disabled={isUploading}
                                            className="hidden"
                                        />

                                        <span className={`material-symbols-outlined text-5xl mb-4 transition-transform group-hover:scale-110 duration-300 ${
                                            file ? 'text-emerald-500' : 'text-blue-500'
                                        }`}>
                                            {file ? 'check_circle' : 'cloud_upload'}
                                        </span>

                                        <p className="font-bold text-base text-slate-800 dark:text-slate-200 text-center">
                                            {file ? 'File Selected' : 'Drag & drop your payroll sheet here'}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
                                            {file ? file.name : 'or click to browse from device'}
                                        </p>

                                        {file && (
                                            <div className="mt-4 px-3 py-1 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-bold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                                                {(file.size / 1024 / 1024).toFixed(2)} MB
                                            </div>
                                        )}
                                    </div>

                                    {/* Upload Progress Bar */}
                                    {isUploading && uploadProgress !== null && (
                                        <div className="mt-6 space-y-2">
                                            <div className="flex justify-between text-xs font-bold">
                                                <span className="text-blue-500">
                                                    {uploadStatus}
                                                </span>
                                                <span className="text-slate-500 dark:text-slate-400">{uploadProgress}%</span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-850 rounded-full overflow-hidden">
                                                <motion.div
                                                    className="h-full bg-blue-500"
                                                    initial={{ width: '0%' }}
                                                    animate={{ width: `${uploadProgress}%` }}
                                                    transition={{ duration: 0.1 }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex gap-4 mt-6">
                                        <button
                                            onClick={handleUpload}
                                            disabled={!file || isUploading}
                                            className="flex-1 px-6 py-3.5 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            {isUploading ? (
                                                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span className="material-symbols-outlined text-lg">rocket_launch</span>
                                            )}
                                            {isUploading ? 'Uploading & Processing...' : 'Upload & Update records'}
                                        </button>

                                        {file && (
                                            <button
                                                onClick={clearFile}
                                                disabled={isUploading}
                                                className="px-6 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-black uppercase tracking-wider flex items-center gap-2 hover:bg-slate-205 dark:hover:bg-slate-700 transition-all border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                                Clear
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Error Notification Banner */}
                                <AnimatePresence>
                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 10 }}
                                            className="p-5 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 flex items-start gap-3"
                                        >
                                            <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                                            <div className="flex-1">
                                                <p className="font-bold text-red-700 dark:text-red-400 text-sm">Upload Processing Error</p>
                                                <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error}</p>
                                            </div>
                                            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* Success summary area */}
                                <AnimatePresence>
                                    {successData && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 15 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 15 }}
                                            className="space-y-6"
                                        >
                                            <div className="p-6 rounded-3xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-500/5">
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
                                                    <div>
                                                        <h3 className="font-black text-lg text-slate-900 dark:text-white leading-tight">
                                                            Processing Complete
                                                        </h3>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                            {successData.message}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4 my-6">
                                                    <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                                                            Total Rows Found
                                                        </p>
                                                        <p className="text-3xl font-black text-blue-600 dark:text-blue-400">
                                                            {successData.recordsProcessed}
                                                        </p>
                                                    </div>
                                                    <div className="bg-white dark:bg-slate-900/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                                                            Records Updated
                                                        </p>
                                                        <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                                                            {successData.recordsInserted}
                                                        </p>
                                                    </div>
                                                </div>

                                                {successData.organizationsProcessed && successData.organizationsProcessed.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2.5">
                                                            Processed Sub-Organizations ({successData.organizationsProcessed.length})
                                                        </p>
                                                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1 border border-slate-200/50 dark:border-slate-800 rounded-xl">
                                                            {successData.organizationsProcessed.map((org, index) => (
                                                                <span
                                                                    key={index}
                                                                    className="px-3 py-1 rounded-full text-xs font-bold border bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                                                                >
                                                                    {org}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </div>

                            {/* Right Column: Information & help guides */}
                            <div className="space-y-6">
                                <div
                                    className={`p-6 rounded-3xl border flex flex-col transition-all ${
                                        isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="material-symbols-outlined text-blue-500">info</span>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white">
                                            Sheet Format Guidelines
                                        </h3>
                                    </div>

                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
                                        The upload processor scans the document to find the header row automatically. Ensure your sheet has columns matching these labels or their common aliases:
                                    </p>

                                    <div className="space-y-3">
                                        {[
                                            { name: 'Staff Id', status: 'Required', aliases: 'employeeid, staffid, id' },
                                            { name: 'Full Name', status: 'Required', aliases: 'fullname, name' },
                                            { name: 'Net Pay', status: 'Required', aliases: 'netpay, net' },
                                            { name: 'Sub Organization', status: 'Required', aliases: 'mda, employer' },
                                            { name: 'Gross Pay', status: 'Required', aliases: 'grosspay, gross' },
                                            { name: 'Pay Group', status: 'Optional', aliases: 'paygroup, group' },
                                            { name: 'Staff Category', status: 'Optional', aliases: 'level' },
                                            { name: 'Location', status: 'Optional', aliases: 'state, city' },
                                        ].map((col, idx) => (
                                            <div
                                                key={idx}
                                                className={`p-3 rounded-xl border flex flex-col gap-1 text-xs ${
                                                    col.status === 'Required'
                                                        ? isDark ? 'bg-blue-500/5 border-blue-500/10' : 'bg-blue-50/30 border-blue-100'
                                                        : isDark ? 'bg-slate-900/20 border-slate-850' : 'bg-slate-50/50 border-slate-100'
                                                }`}
                                            >
                                                <div className="flex justify-between items-center font-bold">
                                                    <span className={col.status === 'Required' ? 'text-blue-500' : 'text-slate-700 dark:text-slate-300'}>
                                                        {col.name}
                                                    </span>
                                                    <span className={`text-[8px] uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                                        col.status === 'Required'
                                                            ? 'text-blue-500 bg-blue-500/10 border-blue-500/20'
                                                            : 'text-slate-400 border-slate-200 dark:border-slate-800'
                                                    }`}>
                                                        {col.status}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                                                    <span className="font-bold">Aliases:</span> {col.aliases}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="view-records"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            <div className={`p-6 rounded-3xl border transition-all ${
                                isDark ? 'bg-[#111827]/40 border-slate-800/60' : 'bg-white border-slate-200 shadow-sm'
                            }`}>
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div className="relative w-full md:w-96">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                            search
                                        </span>
                                        <input
                                            type="text"
                                            placeholder="Search by Name or Staff ID..."
                                            value={searchQuery}
                                            onChange={(e) => {
                                                setSearchQuery(e.target.value);
                                                setPage(1);
                                            }}
                                            className={`w-full pl-11 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm ${
                                                isDark 
                                                    ? 'bg-slate-900 border-slate-700 text-white placeholder-slate-500' 
                                                    : 'bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400'
                                            }`}
                                        />
                                    </div>
                                    <div className="text-sm font-bold text-slate-500">
                                        Total Records: {totalRecords}
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className={`border-b ${isDark ? 'border-slate-800/60 text-slate-400' : 'border-slate-200 text-slate-500'} text-xs uppercase tracking-wider font-black`}>
                                                <th className="pb-4 pl-4 font-black">Staff Details</th>
                                                <th className="pb-4">Organization</th>
                                                <th className="pb-4">Net Pay</th>
                                                <th className="pb-4">Gross Pay</th>
                                                <th className="pb-4 pr-4">Category/Group</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                            {isLoadingRecords ? (
                                                <tr>
                                                    <td colSpan={5} className="py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center">
                                                            <div className="size-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                                                            <p className="text-slate-500 text-sm font-medium">Loading records...</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : records.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="py-16 text-center">
                                                        <div className="flex flex-col items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined text-5xl mb-2">inbox</span>
                                                            <p className="text-sm font-medium">No payroll records found.</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                records.map((record) => (
                                                    <tr key={record.id} className={`group transition-colors hover:${isDark ? 'bg-slate-800/30' : 'bg-slate-50/50'}`}>
                                                        <td className="py-4 pl-4">
                                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{record.full_name}</div>
                                                            <div className="text-xs text-slate-500 font-medium mt-0.5">{record.staff_id}</div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">{record.sub_organization}</div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(record.net_pay)}</div>
                                                        </td>
                                                        <td className="py-4">
                                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatMoney(record.gross_pay)}</div>
                                                        </td>
                                                        <td className="py-4 pr-4">
                                                            <div className="flex flex-col gap-1 items-start">
                                                                {record.staff_category && (
                                                                    <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                                        {record.staff_category}
                                                                    </span>
                                                                )}
                                                                {record.pay_group && (
                                                                    <span className="px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                                                                        {record.pay_group}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Pagination controls */}
                                {!isLoadingRecords && totalRecords > 0 && (
                                    <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-800/60 pt-6">
                                        <div className="text-sm text-slate-500 font-medium">
                                            Showing <span className="font-bold text-slate-800 dark:text-slate-200">{(page - 1) * limit + 1}</span> to <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(page * limit, totalRecords)}</span> of <span className="font-bold text-slate-800 dark:text-slate-200">{totalRecords}</span> records
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                                disabled={page === 1}
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                                            </button>
                                            <div className="px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-sm font-bold">
                                                {page}
                                            </div>
                                            <button
                                                onClick={() => setPage(p => p + 1)}
                                                disabled={page * limit >= totalRecords}
                                                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                            >
                                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Add Manual Record Modal */}
                <AnimatePresence>
                    {isManualModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm">
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                className={`w-full max-w-2xl rounded-3xl p-8 border shadow-2xl relative max-h-[90vh] overflow-y-auto ${
                                    isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
                                }`}
                            >
                                <button
                                    onClick={() => setIsManualModalOpen(false)}
                                    className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                                >
                                    <span className="material-symbols-outlined">close</span>
                                </button>

                                <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">
                                    Add Manual Payroll Record
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 mb-6">
                                    Fill in the fields below to add or update an individual payroll record.
                                </p>

                                {manualError && (
                                    <div className="p-4 mb-6 rounded-xl text-xs font-bold border bg-red-500/10 border-red-500/20 text-red-500 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">error</span>
                                        {manualError}
                                    </div>
                                )}

                                {manualSuccess && (
                                    <div className="p-4 mb-6 rounded-xl text-xs font-bold border bg-emerald-500/10 border-emerald-500/20 text-emerald-500 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">check_circle</span>
                                        {manualSuccess}
                                    </div>
                                )}

                                <form onSubmit={handleManualSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        
                                        {/* Staff ID */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Staff ID <span className="text-blue-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={manualForm.staff_id}
                                                onChange={(e) => setManualForm(f => ({ ...f, staff_id: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Full Name */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Full Name <span className="text-blue-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                value={manualForm.full_name}
                                                onChange={(e) => setManualForm(f => ({ ...f, full_name: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Sub Organization */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Sub Organization <span className="text-blue-500">*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="e.g. Ministry of Works"
                                                value={manualForm.sub_organization}
                                                onChange={(e) => setManualForm(f => ({ ...f, sub_organization: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Gross Pay */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Gross Pay (₦) <span className="text-blue-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={manualForm.gross_pay}
                                                onChange={(e) => setManualForm(f => ({ ...f, gross_pay: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Net Pay */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Net Pay (₦) <span className="text-blue-500">*</span>
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                min="0"
                                                step="0.01"
                                                value={manualForm.net_pay}
                                                onChange={(e) => setManualForm(f => ({ ...f, net_pay: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Total Deductions */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Total Deductions (₦)
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={manualForm.total_deductions}
                                                onChange={(e) => setManualForm(f => ({ ...f, total_deductions: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Pay Group */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Pay Group
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Senior Staff"
                                                value={manualForm.pay_group}
                                                onChange={(e) => setManualForm(f => ({ ...f, pay_group: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Staff Category */}
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Staff Category
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. GL-14"
                                                value={manualForm.staff_category}
                                                onChange={(e) => setManualForm(f => ({ ...f, staff_category: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>

                                        {/* Location */}
                                        <div className="space-y-1.5 md:col-span-2">
                                            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                                                Location
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Abuja"
                                                value={manualForm.location}
                                                onChange={(e) => setManualForm(f => ({ ...f, location: e.target.value }))}
                                                className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-blue-500/50 focus:outline-none text-sm ${
                                                    isDark ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-905'
                                                }`}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-8 pt-4 border-t border-slate-800/40">
                                        <button
                                            type="button"
                                            onClick={() => setIsManualModalOpen(false)}
                                            className="px-6 py-3 rounded-xl border border-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider hover:text-white transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isSubmittingManual}
                                            className="flex-1 px-6 py-3 rounded-xl bg-blue-600 text-white text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-blue-700 transition-all disabled:opacity-50"
                                        >
                                            {isSubmittingManual ? (
                                                <div className="size-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            ) : (
                                                <span className="material-symbols-outlined text-lg">save</span>
                                            )}
                                            {isSubmittingManual ? 'Saving Record...' : 'Save Record'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </StaffLayout>
    );
};

export default PayrollUploadPage;
