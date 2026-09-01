import React, { useRef, useState } from 'react';
import axios from 'axios';
import {
    MOBILE_HOME_BANNER,
    bannerSpecHint,
    checkBannerDimensions,
    readImageDimensions,
} from '../../constants/mobileBannerSpec';

type Props = {
    value: string | null;
    onChange: (url: string | null) => void;
    disabled?: boolean;
};

const BannerImageUploader: React.FC<Props> = ({ value, onChange, disabled }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [dimensionHint, setDimensionHint] = useState<string | null>(null);

    const handleFile = async (file: File) => {
        setError(null);
        setDimensionHint(null);

        if (!MOBILE_HOME_BANNER.acceptedTypes.includes(file.type as typeof MOBILE_HOME_BANNER.acceptedTypes[number])) {
            setError('Use JPG, PNG, or WebP.');
            return;
        }
        if (file.size > MOBILE_HOME_BANNER.maxFileSizeMb * 1024 * 1024) {
            setError(`Image must be under ${MOBILE_HOME_BANNER.maxFileSizeMb}MB.`);
            return;
        }

        let dims: { width: number; height: number };
        try {
            dims = await readImageDimensions(file);
        } catch {
            setError('Could not read image. Try another file.');
            return;
        }

        const check = checkBannerDimensions(dims.width, dims.height);
        setDimensionHint(check.message);
        if (!check.ok) {
            setError(check.message);
            return;
        }

        setUploading(true);
        try {
            const form = new FormData();
            form.append('file', file);
            const res = await axios.post('/api/staff/mobile-notifications/banners/upload-image', form, {
                withCredentials: true,
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            onChange(res.data.image_url as string);
            setDimensionHint(`Uploaded ${res.data.width}×${res.data.height}px`);
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
        <div className="space-y-3">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-bold text-slate-800 dark:text-white">Banner image</p>
                    <p className="text-xs text-slate-500 mt-1">
                        {bannerSpecHint()}. Upload blocked if too large or wrong ratio.
                    </p>
                </div>
                {value ? (
                    <button
                        type="button"
                        className="text-xs font-bold text-rose-600"
                        onClick={() => onChange(null)}
                        disabled={disabled || uploading}
                    >
                        Remove
                    </button>
                ) : null}
            </div>

            {value ? (
                <div className="overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                    <img src={value} alt="Banner preview" className="w-full aspect-[3/1] object-cover" />
                </div>
            ) : (
                <button
                    type="button"
                    disabled={disabled || uploading}
                    onClick={() => inputRef.current?.click()}
                    className="w-full border border-dashed border-slate-300 dark:border-slate-600 py-10 px-4 text-center hover:border-[#084399] hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-colors disabled:opacity-60"
                >
                    <span className="material-symbols-outlined text-2xl text-slate-400 mb-2 block">upload</span>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 block">
                        {uploading ? 'Uploading…' : 'Upload banner image'}
                    </span>
                    <span className="text-xs text-slate-500 mt-1 block">{bannerSpecHint()}</span>
                </button>
            )}

            <input
                ref={inputRef}
                type="file"
                accept={MOBILE_HOME_BANNER.acceptedTypes.join(',')}
                className="hidden"
                onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                    e.target.value = '';
                }}
            />

            {dimensionHint && !error ? (
                <p className="text-xs text-emerald-600 font-medium">{dimensionHint}</p>
            ) : null}
            {error ? <p className="text-xs text-rose-600 font-medium">{error}</p> : null}
        </div>
    );
};

export default BannerImageUploader;
