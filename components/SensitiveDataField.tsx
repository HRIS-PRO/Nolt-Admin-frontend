import React, { useState } from 'react';
import axios from 'axios';
import { maskValue } from '../utils/maskHelper';

interface SensitiveDataFieldProps {
    loanId: string | number;
    field: 'bvn' | 'nin';
    label: string;
    initialValue?: string;
    verified?: boolean;
}

const SensitiveDataField: React.FC<SensitiveDataFieldProps> = ({ loanId, field, label, initialValue, verified }) => {
    const getInitialPlaceholder = () => {
        if (!initialValue) return '*******';
        if (verified) return maskValue(initialValue);
        return initialValue;
    };

    const [isVisible, setIsVisible] = useState(false);
    const [value, setValue] = useState(getInitialPlaceholder());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleReveal = async () => {
        if (isVisible) {
            setIsVisible(false);
            setValue(getInitialPlaceholder());
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await axios.post(
                `/api/staff/loans/${loanId}/reveal`,
                { field },
                { withCredentials: true }
            );
            setValue(response.data.value);
            setIsVisible(true);
        } catch (err) {
            console.error("Failed to reveal:", err);
            setError('Failed to load');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center justify-between">
                {label}
                {verified && field === 'bvn' && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-green-500/10 text-green-600 rounded text-[8px] font-black uppercase tracking-tighter border border-green-500/20">
                        <span className="material-symbols-outlined text-[10px]">verified</span>
                        Verified
                    </span>
                )}
            </p>
            <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900 dark:text-white text-base leading-relaxed break-words font-heading">
                    {value}
                </p>
                <button
                    onClick={handleReveal}
                    disabled={isLoading}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-sm">
                        {isLoading ? 'hourglass_empty' : (isVisible ? 'visibility_off' : 'visibility')}
                    </span>
                </button>
            </div>
            {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
        </div>
    );
};

export default SensitiveDataField;
