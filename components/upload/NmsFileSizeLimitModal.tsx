import React from 'react';
import { NMS_MAX_UPLOAD_LABEL, formatFileSize } from '../../utils/nmsUploadLimits';

type Props = {
    open: boolean;
    fileName?: string;
    fileSizeBytes?: number;
    onClose: () => void;
};

const NmsFileSizeLimitModal: React.FC<Props> = ({ open, fileName, fileSizeBytes, onClose }) => {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4"
                role="alertdialog"
                aria-labelledby="nms-upload-limit-title"
            >
                <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-amber-500 text-3xl shrink-0">upload_file</span>
                    <div>
                        <h3 id="nms-upload-limit-title" className="text-lg font-black text-slate-900 dark:text-white">
                            File too large
                        </h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                            Attachments on NMS must be {NMS_MAX_UPLOAD_LABEL} or smaller.
                            {fileName ? (
                                <>
                                    {' '}
                                    <strong className="text-slate-800 dark:text-slate-200">{fileName}</strong>
                                    {fileSizeBytes != null ? ` (${formatFileSize(fileSizeBytes)})` : ''} exceeds this limit.
                                </>
                            ) : (
                                ' Please choose a smaller file or compress the document before uploading.'
                            )}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm uppercase tracking-wider"
                >
                    OK
                </button>
            </div>
        </div>
    );
};

export default NmsFileSizeLimitModal;
