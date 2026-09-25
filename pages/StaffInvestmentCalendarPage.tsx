import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import { fieldClass, labelClass, panelClass, primaryBtnClass } from '../components/mobile/push-hub-styles';

interface HolidayTemplate {
    id: number;
    name: string;
    notes: string | null;
}

interface HolidayDateRow {
    id: number;
    template_id: number;
    holiday_date: string;
    calendar_year: number;
    template_name?: string;
}

interface OperatingPreview {
    allowed: boolean;
    reason: string;
    message: string;
    nextAvailableLabel: string | null;
}

interface StaffInvestmentCalendarPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

type PageTab = 'holidays' | 'settings';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** YYYY-MM-DD → weekday label without UTC shift */
function weekdayFromDateKey(dateKey: string): string {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return new Intl.DateTimeFormat('en-NG', { weekday: 'short' }).format(dt);
}

function formatCalendarDateLabel(dateKey: string): string {
    const [y, mo, d] = dateKey.split('-').map(Number);
    const dt = new Date(y, mo - 1, d);
    return new Intl.DateTimeFormat('en-NG', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(dt);
}

const secondaryBtnClass =
    'h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50';

const tabClass = (active: boolean) =>
    `px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${
        active
            ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`;

export default function StaffInvestmentCalendarPage({
    user,
    onLogout,
    toggleTheme,
    theme,
}: StaffInvestmentCalendarPageProps) {
    const currentYear = new Date().getFullYear();
    const [tab, setTab] = useState<PageTab>('holidays');
    const [year, setYear] = useState(currentYear);
    const [templates, setTemplates] = useState<HolidayTemplate[]>([]);
    const [dates, setDates] = useState<HolidayDateRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateNotes, setNewTemplateNotes] = useState('');
    const [assignTemplateId, setAssignTemplateId] = useState<number | ''>('');
    const [assignDate, setAssignDate] = useState('');

    const [cutoff, setCutoff] = useState('15:00');
    const [timezone, setTimezone] = useState('Africa/Lagos');
    const [weekendDays, setWeekendDays] = useState<number[]>([6, 0]);
    const [preview, setPreview] = useState<OperatingPreview | null>(null);

    const [copyFromYear, setCopyFromYear] = useState(currentYear - 1);
    const [copyToYear, setCopyToYear] = useState(currentYear);
    const [busy, setBusy] = useState(false);

    const sortedDates = useMemo(
        () => [...dates].sort((a, b) => a.holiday_date.localeCompare(b.holiday_date)),
        [dates],
    );

    const loadAll = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tplRes, cfgRes, previewRes] = await Promise.all([
                axios.get(`/api/staff/investment-calendar/templates?year=${year}`, { withCredentials: true }),
                axios.get('/api/staff/investment-calendar/config', { withCredentials: true }),
                axios.get('/api/staff/investment-calendar/preview', { withCredentials: true }),
            ]);
            setTemplates(tplRes.data.templates ?? []);
            setDates(tplRes.data.dates ?? []);
            setCutoff(String(cfgRes.data.liquidation_cutoff_local_time ?? '15:00').slice(0, 5));
            setTimezone(cfgRes.data.timezone ?? 'Africa/Lagos');
            setWeekendDays(cfgRes.data.weekend_days ?? [6, 0]);
            setPreview(previewRes.data);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            setError(msg ?? 'Failed to load investment calendar.');
        } finally {
            setLoading(false);
        }
    }, [year]);

    useEffect(() => {
        void loadAll();
    }, [loadAll]);

    const handleCreateTemplate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTemplateName.trim()) return;
        setBusy(true);
        try {
            await axios.post(
                '/api/staff/investment-calendar/templates',
                { name: newTemplateName.trim(), notes: newTemplateNotes.trim() || null },
                { withCredentials: true },
            );
            setNewTemplateName('');
            setNewTemplateNotes('');
            await loadAll();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            alert(msg ?? 'Could not create holiday.');
        } finally {
            setBusy(false);
        }
    };

    const handleAssignDate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assignTemplateId || !assignDate) return;
        setBusy(true);
        try {
            await axios.post(
                '/api/staff/investment-calendar/dates',
                {
                    template_id: assignTemplateId,
                    holiday_date: assignDate,
                    calendar_year: year,
                },
                { withCredentials: true },
            );
            setAssignDate('');
            await loadAll();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            alert(msg ?? 'Could not assign date.');
        } finally {
            setBusy(false);
        }
    };

    const handleSaveConfig = async () => {
        setBusy(true);
        try {
            await axios.put(
                '/api/staff/investment-calendar/config',
                {
                    timezone,
                    liquidation_cutoff_local_time: cutoff,
                    weekend_days: weekendDays,
                },
                { withCredentials: true },
            );
            const previewRes = await axios.get('/api/staff/investment-calendar/preview', { withCredentials: true });
            setPreview(previewRes.data);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            alert(msg ?? 'Could not save settings.');
        } finally {
            setBusy(false);
        }
    };

    const handleCopyYear = async () => {
        setBusy(true);
        try {
            const res = await axios.post(
                '/api/staff/investment-calendar/copy-year',
                { from_year: copyFromYear, to_year: copyToYear },
                { withCredentials: true },
            );
            alert(`Copied ${res.data.copied} holiday date(s). Skipped ${res.data.skipped} duplicate(s).`);
            if (copyToYear === year) await loadAll();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            alert(msg ?? 'Copy failed.');
        } finally {
            setBusy(false);
        }
    };

    const toggleWeekendDay = (day: number) => {
        setWeekendDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
        );
    };

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="max-w-6xl mx-auto space-y-6 pb-16">
                <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                            Mobile · Investments
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                            Liquidation calendar
                        </h1>
                        <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-xl text-sm leading-relaxed">
                            Public holidays and business hours for customer fixed-deposit liquidation. Dates are
                            calendar days in Nigeria (WAT), not UTC.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                        <div className="min-w-[120px]">
                            <label className={labelClass}>Year</label>
                            <select
                                className={fieldClass}
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                            >
                                {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <button type="button" className={secondaryBtnClass} disabled={loading} onClick={() => void loadAll()}>
                            Refresh
                        </button>
                    </div>
                </header>

                {error ? (
                    <div className={`${panelClass} p-5 text-red-600 dark:text-red-400 text-sm`}>{error}</div>
                ) : null}

                <section className={`${panelClass} p-6 md:p-8`}>
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-400">
                            Customer preview (now)
                        </h2>
                        <span
                            className={`text-xs font-bold px-3 py-1 rounded-full ${
                                preview?.allowed
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200'
                            }`}
                        >
                            {preview?.allowed ? 'Open' : 'Closed'}
                        </span>
                    </div>
                    {preview ? (
                        <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{preview.message}</p>
                    ) : (
                        <p className="text-sm text-slate-500">Loading…</p>
                    )}
                    {preview && !preview.allowed && preview.nextAvailableLabel ? (
                        <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                            Next window: {preview.nextAvailableLabel}
                        </p>
                    ) : null}
                </section>

                <div className="flex gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/80 w-fit">
                    <button type="button" className={tabClass(tab === 'holidays')} onClick={() => setTab('holidays')}>
                        Holidays
                    </button>
                    <button type="button" className={tabClass(tab === 'settings')} onClick={() => setTab('settings')}>
                        Operating rules
                    </button>
                </div>

                {tab === 'settings' ? (
                    <div className="grid lg:grid-cols-2 gap-6">
                        <section className={`${panelClass} p-6 md:p-8 space-y-5`}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Cutoff &amp; weekends</h2>
                            <div>
                                <label className={labelClass}>Timezone</label>
                                <input className={fieldClass} value={timezone} onChange={(e) => setTimezone(e.target.value)} />
                            </div>
                            <div>
                                <label className={labelClass}>Daily liquidation cutoff</label>
                                <input
                                    className={fieldClass}
                                    type="time"
                                    value={cutoff}
                                    onChange={(e) => setCutoff(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Non-business weekdays</label>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {WEEKDAY_LABELS.map((label, idx) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => toggleWeekendDay(idx)}
                                            className={`min-w-[3rem] px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                                weekendDays.includes(idx)
                                                    ? 'bg-blue-600 text-white border-blue-600'
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button type="button" className={primaryBtnClass} disabled={busy} onClick={() => void handleSaveConfig()}>
                                Save operating rules
                            </button>
                        </section>

                        <section className={`${panelClass} p-6 md:p-8 space-y-5`}>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Copy to another year</h2>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                Copies holiday names and the same month/day. 29 February becomes 28 February in non-leap years.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className={labelClass}>From</label>
                                    <input
                                        className={fieldClass}
                                        type="number"
                                        value={copyFromYear}
                                        onChange={(e) => setCopyFromYear(Number(e.target.value))}
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>To</label>
                                    <input
                                        className={fieldClass}
                                        type="number"
                                        value={copyToYear}
                                        onChange={(e) => setCopyToYear(Number(e.target.value))}
                                    />
                                </div>
                            </div>
                            <button type="button" className={primaryBtnClass} disabled={busy} onClick={() => void handleCopyYear()}>
                                Copy holidays
                            </button>
                        </section>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid lg:grid-cols-2 gap-6">
                            <section className={`${panelClass} p-6 md:p-8`}>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Holiday names</h2>
                                <p className="text-sm text-slate-500 mb-5">Reusable labels (e.g. Independence Day).</p>
                                <form onSubmit={handleCreateTemplate} className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Name</label>
                                        <input
                                            className={fieldClass}
                                            value={newTemplateName}
                                            onChange={(e) => setNewTemplateName(e.target.value)}
                                            placeholder="Independence Day"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>Notes (optional)</label>
                                        <input
                                            className={fieldClass}
                                            value={newTemplateNotes}
                                            onChange={(e) => setNewTemplateNotes(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className={primaryBtnClass} disabled={busy}>
                                        Add holiday name
                                    </button>
                                </form>
                            </section>

                            <section className={`${panelClass} p-6 md:p-8`}>
                                <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Assign to a date</h2>
                                <p className="text-sm text-slate-500 mb-5">
                                    Pick the exact calendar day in {year}. The date you select is stored as-is (no timezone shift).
                                </p>
                                <form onSubmit={handleAssignDate} className="space-y-4">
                                    <div>
                                        <label className={labelClass}>Holiday</label>
                                        <select
                                            className={fieldClass}
                                            value={assignTemplateId}
                                            onChange={(e) => setAssignTemplateId(e.target.value ? Number(e.target.value) : '')}
                                        >
                                            <option value="">Select holiday…</option>
                                            {templates.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelClass}>Date</label>
                                        <input
                                            className={fieldClass}
                                            type="date"
                                            value={assignDate}
                                            min={`${year}-01-01`}
                                            max={`${year}-12-31`}
                                            onChange={(e) => setAssignDate(e.target.value)}
                                        />
                                    </div>
                                    <button type="submit" className={primaryBtnClass} disabled={busy || !assignTemplateId}>
                                        Mark as public holiday
                                    </button>
                                </form>
                            </section>
                        </div>

                        <section className={`${panelClass} overflow-hidden`}>
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                                        {year} public holidays
                                    </h2>
                                    <p className="text-sm text-slate-500 mt-0.5">{sortedDates.length} date(s) configured</p>
                                </div>
                            </div>
                            {loading ? (
                                <p className="p-6 text-sm text-slate-500">Loading…</p>
                            ) : sortedDates.length === 0 ? (
                                <p className="p-6 text-sm text-slate-500">No holidays assigned for {year} yet.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900/50">
                                                <th className="px-6 py-3">Calendar date</th>
                                                <th className="px-6 py-3">Day</th>
                                                <th className="px-6 py-3">Holiday</th>
                                                <th className="px-6 py-3 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {sortedDates.map((row) => {
                                                const name =
                                                    row.template_name
                                                    ?? templates.find((t) => t.id === row.template_id)?.name
                                                    ?? '—';
                                                return (
                                                    <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/30">
                                                        <td className="px-6 py-4 font-mono text-slate-700 dark:text-slate-200">
                                                            {row.holiday_date}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                                            {weekdayFromDateKey(row.holiday_date)}
                                                        </td>
                                                        <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white">
                                                            {name}
                                                            <span className="block text-xs font-normal text-slate-500 mt-0.5 lg:hidden">
                                                                {formatCalendarDateLabel(row.holiday_date)}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <button
                                                                type="button"
                                                                className="text-xs font-bold text-red-600 hover:text-red-700 dark:text-red-400"
                                                                onClick={async () => {
                                                                    if (!confirm(`Remove ${name} on ${row.holiday_date}?`)) return;
                                                                    await axios.delete(
                                                                        `/api/staff/investment-calendar/dates/${row.id}`,
                                                                        { withCredentials: true },
                                                                    );
                                                                    await loadAll();
                                                                }}
                                                            >
                                                                Remove
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {templates.length > 0 ? (
                            <section className={`${panelClass} p-6 md:p-8`}>
                                <h2 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">
                                    Manage holiday names
                                </h2>
                                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {templates.map((t) => (
                                        <li key={t.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                                            <div>
                                                <p className="font-semibold text-slate-900 dark:text-white">{t.name}</p>
                                                {t.notes ? (
                                                    <p className="text-xs text-slate-500 mt-0.5">{t.notes}</p>
                                                ) : null}
                                            </div>
                                            <button
                                                type="button"
                                                className="text-xs font-bold text-red-600 shrink-0"
                                                onClick={async () => {
                                                    if (!confirm(`Delete "${t.name}" and all assigned dates?`)) return;
                                                    await axios.delete(
                                                        `/api/staff/investment-calendar/templates/${t.id}`,
                                                        { withCredentials: true },
                                                    );
                                                    await loadAll();
                                                }}
                                            >
                                                Delete name
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </section>
                        ) : null}
                    </div>
                )}
            </div>
        </StaffLayout>
    );
}
