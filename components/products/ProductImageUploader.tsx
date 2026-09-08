import React, { useRef, useState } from 'react';
import axios from 'axios';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_MB = 5;

type Props = {
    productId: number;
    value: string | null;
    onChange: (url: string | null) => void;
    disabled?: boolean;
    compact?: boolean;
};

const ProductImageUploader: React.FC<Props> = ({
    productId,
    value,
    onChange,
    disabled,
    compact = false,
}) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        setError(null);

        if (!ACCEPTED_TYPES.includes(file.type)) {
            setError('Use JPG, PNG, or WebP.');
            return;
        }
        if (file.size > MAX_MB * 1024 * 1024) {
            setError(`Image must be under ${MAX_MB}MB.`);
            return;
        }

        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axios.post(`/api/products/${productId}/upload-image`, form, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(res.data.image_url as string);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err)
                ? (err.response?.data as { message?: string })?.message ?? 'Upload failed'
                : 'Upload failed';
            setError(msg);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={compact ? 'space-y-2' : 'space-y-3'}>
            <div className="flex items-start gap-4">
                <div
                    className={`rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 flex items-center justify-center shrink-0 ${compact ? 'size-16' : 'size-24'}`}
                >
                    {value ? (
                        <img src={value} alt="Product" className="w-full h-full object-cover" />
                    ) : (
                        <span className="material-symbols-outlined text-slate-300 text-3xl">image</span>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    {!compact && (
                        <>
                            <p className="text-sm font-bold text-slate-800 dark:text-white">Product image</p>
                            <p className="text-xs text-slate-500 mt-1">
                                Shown on the mobile app product card. Square or landscape works best.
                            </p>
                        </>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                        <button
                            type="button"
                            disabled={disabled || uploading}
                            onClick={() => inputRef.current?.click()}
                            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-[10px] font-black uppercase tracking-widest"
                        >
                            {uploading ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
                        </button>
                        {value ? (
                            <button
                                type="button"
                                disabled={disabled || uploading}
                                onClick={async () => {
                                    setUploading(true);
                                    setError(null);
                                    try {
                                        await axios.delete(`/api/products/${productId}/image`, { withCredentials: true });
                                        onChange(null);
                                    } catch (err: unknown) {
                                        const msg = axios.isAxiosError(err)
                                            ? (err.response?.data as { message?: string })?.message ?? 'Remove failed'
                                            : 'Remove failed';
                                        setError(msg);
                                    } finally {
                                        setUploading(false);
                                    }
                                }}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 text-[10px] font-black uppercase tracking-widest"
                            >
                                Remove
                            </button>
                        ) : null}
                    </div>
                    {error ? <p className="text-xs text-rose-500 mt-2 font-medium">{error}</p> : null}
                </div>
            </div>
            <input
                ref={inputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(',')}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = '';
                }}
            />
        </div>
    );
};

export default ProductImageUploader;
