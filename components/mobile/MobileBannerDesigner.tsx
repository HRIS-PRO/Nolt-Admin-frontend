import React from 'react';
import BannerImageUploader from './BannerImageUploader';
import { HomeBannerPhonePreview } from './HomeBannerPhonePreview';
import { MOBILE_DEEP_LINKS } from '../../constants/mobileBannerSpec';
import { fieldClass, labelClass, panelClass, primaryBtnClass } from './push-hub-styles';

export type BannerFormState = {
    title: string;
    image_url: string | null;
    link_mode: string;
    cta_url: string;
    cta_label: string;
    sort_order: string;
    is_active: boolean;
    starts_at: string;
    ends_at: string;
};

export const emptyBannerForm: BannerFormState = {
    title: '',
    image_url: null,
    link_mode: '/invest',
    cta_url: '/invest',
    cta_label: 'Click me',
    sort_order: '0',
    is_active: true,
    starts_at: '',
    ends_at: '',
};

type Props = {
    form: BannerFormState;
    onChange: (patch: Partial<BannerFormState>) => void;
    onSubmit: (e: React.FormEvent) => void;
    submitting: boolean;
};

export function MobileBannerDesigner({ form, onChange, onSubmit, submitting }: Props) {
    const customLink = form.link_mode === '__custom__';
    const linkHint = customLink ? form.cta_url || '—' : form.link_mode;

    return (
        <form onSubmit={onSubmit} className={`${panelClass} overflow-hidden`}>
            <div className="grid xl:grid-cols-[1fr_340px]">
                <div className="p-6 lg:p-8 space-y-5 border-b xl:border-b-0 xl:border-r border-slate-100 dark:border-slate-800">
                    <div>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Home banner
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mt-1">
                            Full-width creative in the app home sheet — 3:1 ratio, tap opens your chosen destination.
                        </p>
                    </div>

                <div>
                    <label className={labelClass}>Internal name</label>
                    <input
                        className={fieldClass}
                        placeholder="Weekend yield promo — March"
                        value={form.title}
                        onChange={(e) => onChange({ title: e.target.value })}
                        required
                    />
                </div>

                <BannerImageUploader
                    value={form.image_url}
                    onChange={(url) => onChange({ image_url: url })}
                    disabled={submitting}
                />

                <div>
                    <label className={labelClass}>Tap destination</label>
                    <select
                        className={fieldClass}
                        value={form.link_mode}
                        onChange={(e) => {
                            const v = e.target.value;
                            onChange({
                                link_mode: v,
                                cta_url: v === '__custom__' ? form.cta_url : v,
                            });
                        }}
                    >
                        {MOBILE_DEEP_LINKS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                </div>

                {customLink ? (
                    <div>
                        <label className={labelClass}>Custom URL or route</label>
                        <input
                            className={fieldClass}
                            placeholder="/kyc or https://…"
                            value={form.cta_url}
                            onChange={(e) => onChange({ cta_url: e.target.value })}
                            required
                        />
                    </div>
                ) : null}

                <div>
                    <label className={labelClass}>Carousel order</label>
                    <input
                        className={fieldClass}
                        type="number"
                        min={0}
                        value={form.sort_order}
                        onChange={(e) => onChange({ sort_order: e.target.value })}
                    />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>Visible from (optional)</label>
                        <input
                            type="datetime-local"
                            className={fieldClass}
                            value={form.starts_at}
                            onChange={(e) => onChange({ starts_at: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className={labelClass}>Visible until (optional)</label>
                        <input
                            type="datetime-local"
                            className={fieldClass}
                            value={form.ends_at}
                            onChange={(e) => onChange({ ends_at: e.target.value })}
                        />
                    </div>
                </div>

                <label className="flex items-center gap-2.5 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                        type="checkbox"
                        className="w-4 h-4 accent-[#084399]"
                        checked={form.is_active}
                        onChange={(e) => onChange({ is_active: e.target.checked })}
                    />
                    Go live immediately when published
                </label>

                <button
                    type="submit"
                    disabled={submitting || !form.image_url}
                    className={`${primaryBtnClass} w-full sm:w-auto`}
                >
                    {submitting ? 'Publishing…' : 'Publish home banner'}
                </button>
            </div>

            <div className="p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/40 flex items-start justify-center xl:sticky xl:top-0 xl:self-start">
                <HomeBannerPhonePreview
                    imageUrl={form.image_url}
                    linkHint={linkHint}
                />
            </div>
            </div>
        </form>
    );
}
