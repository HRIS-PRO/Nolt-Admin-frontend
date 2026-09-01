import React from 'react';
import { MOBILE_DEEP_LINKS } from '../../constants/mobileBannerSpec';
import { PushLockScreenPreview } from './PushLockScreenPreview';
import { fieldClass, labelClass, panelClass, primaryBtnClass } from './push-hub-styles';

export type DispatchMode = 'immediate' | 'scheduled' | 'draft';

export type CampaignFormState = {
    title: string;
    body: string;
    priority: 'high' | 'normal' | 'low';
    deep_link: string;
    deep_link_mode: string;
    dispatchMode: DispatchMode;
    scheduled_at: string;
};

export const emptyCampaignForm: CampaignFormState = {
    title: '',
    body: '',
    priority: 'normal',
    deep_link: '/invest',
    deep_link_mode: '/invest',
    dispatchMode: 'draft',
    scheduled_at: '',
};

type Props = {
    form: CampaignFormState;
    onChange: (patch: Partial<CampaignFormState>) => void;
    onSubmit: (e: React.FormEvent) => void;
    onCancel: () => void;
    submitting: boolean;
};

const DISPATCH_OPTIONS: { id: DispatchMode; label: string; hint: string }[] = [
    { id: 'immediate', label: 'Send immediately', hint: 'Broadcast to all registered devices now' },
    { id: 'scheduled', label: 'Schedule for later', hint: 'Queue for automatic dispatch at set time' },
    { id: 'draft', label: 'Save as draft', hint: 'Review internally before sending' },
];

export function PushCampaignComposer({ form, onChange, onSubmit, onCancel, submitting }: Props) {
    const customLink = form.deep_link_mode === '__custom__';
    const linkLabel = customLink
        ? form.deep_link || 'Custom link'
        : MOBILE_DEEP_LINKS.find((l) => l.value === form.deep_link_mode)?.label ?? form.deep_link_mode;

    const submitLabel =
        form.dispatchMode === 'immediate'
            ? 'Create & broadcast'
            : form.dispatchMode === 'scheduled'
              ? 'Schedule campaign'
              : 'Save draft';

    return (
        <form onSubmit={onSubmit} className={`${panelClass} overflow-hidden`}>
            <div className="grid xl:grid-cols-[1fr_340px]">
                <div className="p-6 lg:p-8 space-y-6 border-b xl:border-b-0 xl:border-r border-slate-100 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                New push campaign
                            </h2>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                                Compose copy, set priority, and choose when to reach customers.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            className="text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                        >
                            Cancel
                        </button>
                    </div>

                    <div>
                        <label className={labelClass}>Notification title</label>
                        <input
                            className={fieldClass}
                            placeholder="e.g. New announcement from NOLT Finance"
                            value={form.title}
                            onChange={(e) => onChange({ title: e.target.value })}
                            required
                            maxLength={120}
                        />
                        <p className="text-[11px] font-medium text-slate-400 mt-1">{form.title.length}/120 characters</p>
                    </div>

                    <div>
                        <label className={labelClass}>Message body</label>
                        <textarea
                            className={`${fieldClass} min-h-[120px] resize-y`}
                            placeholder="Check out our latest update with enhanced features and rates. Tap to explore."
                            value={form.body}
                            onChange={(e) => onChange({ body: e.target.value })}
                            required
                            maxLength={500}
                        />
                        <p className="text-[11px] font-medium text-slate-400 mt-1">{form.body.length}/500 characters</p>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Priority</label>
                            <select
                                className={fieldClass}
                                value={form.priority}
                                onChange={(e) =>
                                    onChange({ priority: e.target.value as CampaignFormState['priority'] })
                                }
                            >
                                <option value="normal">Normal — inbox + push</option>
                                <option value="high">High — push, inbox & overlay</option>
                                <option value="low">Low — inbox only</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Audience</label>
                            <input
                                className={`${fieldClass} opacity-70 cursor-not-allowed`}
                                value="All mobile customers"
                                readOnly
                                disabled
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Deep link when opened</label>
                        <select
                            className={fieldClass}
                            value={form.deep_link_mode}
                            onChange={(e) => {
                                const v = e.target.value;
                                onChange({
                                    deep_link_mode: v,
                                    deep_link: v === '__custom__' ? form.deep_link : v,
                                });
                            }}
                        >
                            {MOBILE_DEEP_LINKS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        {customLink ? (
                            <input
                                className={`${fieldClass} mt-2`}
                                placeholder="/invest or https://…"
                                value={form.deep_link}
                                onChange={(e) => onChange({ deep_link: e.target.value })}
                            />
                        ) : null}
                        <p className="text-[11px] font-medium text-slate-400 mt-1">Opens: {linkLabel}</p>
                    </div>

                    <div>
                        <label className={labelClass}>Dispatch</label>
                        <div className="grid sm:grid-cols-3 gap-3">
                            {DISPATCH_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => onChange({ dispatchMode: opt.id })}
                                    className={`text-left p-4 rounded-xl border transition-all ${
                                        form.dispatchMode === opt.id
                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10 shadow-sm'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <span className="block text-sm font-bold text-slate-900 dark:text-white">
                                        {opt.label}
                                    </span>
                                    <span className="block text-[11px] font-medium text-slate-500 mt-1 leading-snug">
                                        {opt.hint}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.dispatchMode === 'scheduled' ? (
                        <div>
                            <label className={labelClass}>Scheduled date & time</label>
                            <input
                                type="datetime-local"
                                className={fieldClass}
                                value={form.scheduled_at}
                                onChange={(e) => onChange({ scheduled_at: e.target.value })}
                                required={form.dispatchMode === 'scheduled'}
                                min={new Date().toISOString().slice(0, 16)}
                            />
                            <p className="text-[11px] font-medium text-slate-400 mt-1">
                                Campaign stays queued until this time. Use Send now from the hub to dispatch early.
                            </p>
                        </div>
                    ) : null}

                    <button type="submit" disabled={submitting} className={`${primaryBtnClass} w-full sm:w-auto`}>
                        {submitting ? 'Saving…' : submitLabel}
                    </button>
                </div>

                <div className="p-6 lg:p-8 bg-slate-50 dark:bg-slate-900/40 flex items-start justify-center xl:sticky xl:top-0 xl:self-start">
                    <PushLockScreenPreview title={form.title} body={form.body} />
                </div>
            </div>
        </form>
    );
}
