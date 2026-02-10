import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface LogoutWarningModalProps {
    isOpen: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

const LogoutWarningModal: React.FC<LogoutWarningModalProps> = ({ isOpen, onConfirm, onCancel }) => {
    const [mounted, setMounted] = useState(false);
    // Generate random ID for visual effect once on mount
    const [sessionId] = useState(() => Math.random().toString(36).substring(2, 8).toUpperCase());

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        }
    }, [isOpen]);

    if (!mounted || !isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 transform"
                onClick={onCancel}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-md bg-[#0f1218] rounded-[32px] overflow-hidden shadow-2xl border border-slate-800 transform transition-all duration-300 scale-100 animate-in fade-in zoom-in-95">
                {/* Glow effect at top */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-red-500/20 blur-xl"></div>

                <div className="p-8 flex flex-col items-center text-center">
                    {/* Icon */}
                    <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                        <span className="material-symbols-outlined text-3xl text-red-500">power_settings_new</span>
                    </div>

                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">CONFIRM LOGOUT</h3>

                    <p className="text-slate-400 text-sm leading-relaxed mb-8 max-w-[85%] font-medium">
                        Are you sure you want to end your current session? You
                        will need to re-authenticate to access the
                        administrative dashboard.
                    </p>

                    <div className="flex flex-col gap-3 w-full">
                        <button
                            onClick={onConfirm}
                            className="w-full py-3.5 bg-[#E11D48] hover:bg-[#be123c] active:bg-[#9f1239] text-white rounded-xl font-bold text-sm tracking-wide shadow-[0_4px_14px_rgba(225,29,72,0.4)] hover:shadow-[0_6px_20px_rgba(225,29,72,0.6)] transition-all transform active:scale-[0.98]"
                        >
                            SIGN OUT SECURELY
                        </button>
                        <button
                            onClick={onCancel}
                            className="w-full py-3.5 bg-transparent text-slate-500 hover:text-white font-bold text-xs tracking-widest uppercase transition-colors"
                        >
                            Stay Signed In
                        </button>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-[#161b22] px-6 py-4 border-t border-slate-800/50">
                    <p className="text-[10px] font-bold text-center text-slate-500 tracking-wider uppercase flex items-center justify-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        Session Security Active • ID: {sessionId}
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default LogoutWarningModal;
