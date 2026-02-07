import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface Document {
    id: string;
    document_type: string;
    file_name: string;
    file_url: string;
    uploaded_by_name?: string;
    created_at: string;
    size_bytes?: number;
}

const DocumentsList: React.FC<{ loanId: string | undefined; refreshTrigger?: number }> = ({ loanId, refreshTrigger }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (!loanId) return;
            try {
                const response = await axios.get(`${''}/api/staff/loans/${loanId}/documents`, { withCredentials: true });
                setDocuments(response.data);
            } catch (error) {
                console.error("Failed to fetch documents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDocuments();
    }, [loanId, refreshTrigger]);

    if (loading) {
        return <div className="animate-pulse h-20 bg-slate-50 dark:bg-slate-800 rounded-xl"></div>;
    }

    if (documents.length === 0) {
        return (
            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                <p className="text-xs text-slate-400 font-medium">No documents uploaded</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {documents.map((doc) => (
                <a
                    key={doc.id}
                    href={doc.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
                >
                    <div className="size-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <span className="material-symbols-outlined">description</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-900 dark:text-white text-sm truncate">{doc.file_name}</p>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="uppercase tracking-wider">{doc.document_type.replace(/_/g, ' ')}</span>
                            <span>•</span>
                            <span>{doc.uploaded_by_name || 'System'}</span>
                            <span>•</span>
                            <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-indigo-500 transition-colors">
                        open_in_new
                    </span>
                </a>
            ))}
        </div>
    );
};

export default DocumentsList;
