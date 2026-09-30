import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'motion/react';
import {
    AgentCommissionTier,
    formatNaira,
    formatTenureLabel,
    parseTierFromApi,
    simulateCommission,
} from '../../utils/agentCommissionTierMatch';

const TENURE_PRESETS = [30, 60, 90, 180] as const;
const SIM_MIN = 100_000;
const SIM_MAX = 5_000_000;

type TierFormState = {
    tier_name: string;
    min_investment: string;
    max_investment: string;
    no_max_cap: boolean;
    tenure_days: number;
    commission_percent: string;
    status: 'active' | 'inactive';
    description: string;
};

const emptyForm = (): TierFormState => ({
    tier_name: '',
    min_investment: '100000',
    max_investment: '1000000',
    no_max_cap: false,
    tenure_days: 30,
    commission_percent: '2',
    status: 'active',
    description: '',
});

const AgentCommissionSettings: React.FC = () => {
    const [tiers, setTiers] = useState<AgentCommissionTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [form, setForm] = useState<TierFormState>(emptyForm());
    const [saving, setSaving] = useState(false);
    const [simAmount, setSimAmount] = useState(500_000);
    const [simTenure, setSimTenure] = useState<number>(30);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setBanner({ type, text });
        setTimeout(() => setBanner(null), 6000);
    };

    const fetchTiers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await axios.get('/api/staff/agent-commission-tiers', { withCredentials: true });
            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            setTiers(rows.map((r: Record<string, unknown>) => parseTierFromApi(r)));
        } catch (err: any) {
            showBanner('error', err.response?.data?.message || 'Failed to load commission tiers.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTiers();
    }, [fetchTiers]);

    const simulation = useMemo(
        () => simulateCommission(tiers, simAmount, simTenure),
        [tiers, simAmount, simTenure],
    );

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm());
        setModalOpen(true);
    };

    const openEdit = (tier: AgentCommissionTier) => {
        setEditingId(tier.id);
        setForm({
            tier_name: tier.tier_name,
            min_investment: String(tier.min_investment),
            max_investment: tier.max_investment == null ? '' : String(tier.max_investment),
            no_max_cap: tier.max_investment == null,
            tenure_days: tier.tenure_days,
            commission_percent: String(tier.commission_percent),
            status: tier.status,
            description: tier.description ?? '',
        });
        setModalOpen(true);
    };

    const buildPayload = () => {
        const min = Number(form.min_investment);
        const max = form.no_max_cap ? null : Number(form.max_investment);
        return {
            tier_name: form.tier_name.trim(),
            min_investment: min,
            max_investment: max,
            tenure_days: form.tenure_days,
            commission_percent: Number(form.commission_percent),
            status: form.status,
            description: form.description.trim() || null,
        };
    };

    const handleSaveTier = async () => {
        const payload = buildPayload();
        if (!payload.tier_name) {
            showBanner('error', 'Tier name is required.');
            return;
        }
        if (!Number.isFinite(payload.min_investment) || payload.min_investment < 0) {
            showBanner('error', 'Enter a valid minimum investment.');
            return;
        }
        if (payload.max_investment != null && (!Number.isFinite(payload.max_investment) || payload.max_investment < payload.min_investment)) {
            showBanner('error', 'Maximum investment must be at least the minimum.');
            return;
        }
        if (!Number.isFinite(payload.commission_percent) || payload.commission_percent < 0 || payload.commission_percent > 100) {
            showBanner('error', 'Commission must be between 0 and 100%.');
            return;
        }

        setSaving(true);
        try {
            if (editingId) {
                const res = await axios.put(`/api/staff/agent-commission-tiers/${editingId}`, payload, { withCredentials: true });
                const updated = parseTierFromApi(res.data.data);
                setTiers((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
                showBanner('success', 'Commission tier updated.');
            } else {
                const res = await axios.post('/api/staff/agent-commission-tiers', payload, { withCredentials: true });
                const created = parseTierFromApi(res.data.data);
                setTiers((prev) => [...prev, created].sort((a, b) => a.tenure_days - b.tenure_days || a.min_investment - b.min_investment));
                showBanner('success', 'Commission tier created.');
            }
            setModalOpen(false);
        } catch (err: any) {
            showBanner('error', err.response?.data?.message || 'Failed to save tier.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (tier: AgentCommissionTier) => {
        if (!window.confirm(`Remove tier "${tier.tier_name}"? This deactivates the rule (soft delete).`)) return;
        try {
            await axios.delete(`/api/staff/agent-commission-tiers/${tier.id}`, { withCredentials: true });
            setTiers((prev) => prev.filter((t) => t.id !== tier.id));
            showBanner('success', 'Tier removed.');
        } catch (err: any) {
            showBanner('error', err.response?.data?.message || 'Failed to delete tier.');
        }
    };

    const handleResetDefaults = async () => {
        if (!window.confirm('Replace all current tiers with the 8 default rules? Custom tiers will be archived.')) return;
        try {
            const res = await axios.post('/api/staff/agent-commission-tiers/reset-defaults', {}, { withCredentials: true });
            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            setTiers(rows.map((r: Record<string, unknown>) => parseTierFromApi(r)));
            showBanner('success', res.data?.message || 'Defaults restored.');
        } catch (err: any) {
            showBanner('error', err.response?.data?.message || 'Failed to reset defaults.');
        }
    };

    const activeCount = tiers.filter((t) => t.status === 'active').length;

    const quickScenarios = [
        { label: '₦500k · 30 Days (2%)', amount: 500_000, tenure: 30 },
        { label: '₦1M · 60 Days', amount: 1_000_000, tenure: 60 },
        { label: '₦2M · 90 Days', amount: 2_000_000, tenure: 90 },
        { label: '₦5M · 180 Days', amount: 5_000_000, tenure: 180 },
    ];

    return (
        <div className="space-y-8">
            {banner && (
                <div
                    className={`p-4 rounded-xl text-xs font-bold border ${
                        banner.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400'
                    }`}
                >
                    {banner.text}
                </div>
            )}

            <div className="p-6 bg-blue-500/5 dark:bg-blue-500/10 rounded-[2rem] border border-blue-500/20 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            Agent Referral Commission Rules
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-blue-500/15 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
                            Agent Commission Engine
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                            Active Matrix
                        </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-bold leading-relaxed max-w-3xl">
                        Configure capital amounts and tenures mapped to percentage commissions. Rules apply when an investment
                        application is created via an agent referral URL.
                    </p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Active rules: {activeCount} tier{activeCount === 1 ? '' : 's'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={handleResetDefaults}
                        className="px-5 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                        Reset Defaults
                    </button>
                    <button
                        type="button"
                        onClick={openCreate}
                        className="px-5 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
                    >
                        Add Commission Tier
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <span className="material-symbols-outlined text-blue-500 text-xl">science</span>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        Live Commission Rate Simulator
                    </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                    {quickScenarios.map((s) => (
                        <button
                            key={s.label}
                            type="button"
                            onClick={() => {
                                setSimAmount(s.amount);
                                setSimTenure(s.tenure);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                        >
                            {s.label}
                        </button>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                            Test investment amount — {formatNaira(simAmount)}
                        </label>
                        <input
                            type="range"
                            min={SIM_MIN}
                            max={SIM_MAX}
                            step={10_000}
                            value={simAmount}
                            onChange={(e) => setSimAmount(Number(e.target.value))}
                            className="w-full accent-blue-600"
                        />
                        <div className="space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Investment duration / tenure
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {TENURE_PRESETS.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setSimTenure(d)}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            simTenure === d
                                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                        }`}
                                    >
                                        {d} Days
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-4 relative">
                        {simulation.matched && (
                            <span className="absolute top-4 right-4 px-2 py-1 rounded-md bg-emerald-500/15 text-[9px] font-black uppercase text-emerald-600">
                                Matched Tier
                            </span>
                        )}
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Calculated commission breakdown</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Commission rate</p>
                                <p className="text-2xl font-black text-slate-900 dark:text-white">{simulation.commission_rate}%</p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase">Agent commission payout</p>
                                <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                                    {formatNaira(simulation.commission_payout)}
                                </p>
                            </div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-500 leading-relaxed">{simulation.message}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b]/70 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-8 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
                        Configured amount &amp; duration tiers
                    </h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        {tiers.length} total rule{tiers.length === 1 ? '' : 's'} configured
                    </span>
                </div>

                {loading ? (
                    <p className="text-xs font-bold text-slate-500 py-8 text-center">Loading tiers…</p>
                ) : tiers.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                        <p className="text-xs font-bold text-slate-500">No commission tiers yet.</p>
                        <button
                            type="button"
                            onClick={handleResetDefaults}
                            className="px-6 py-3 bg-blue-600 text-white font-black uppercase tracking-widest text-[10px] rounded-xl"
                        >
                            Load default tiers
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    <th className="pb-3 pr-4">Tier / name</th>
                                    <th className="pb-3 pr-4">Investment capital range</th>
                                    <th className="pb-3 pr-4">Duration / tenure</th>
                                    <th className="pb-3 pr-4">Commission %</th>
                                    <th className="pb-3 pr-4">Sample payout</th>
                                    <th className="pb-3 pr-4 text-center">Status</th>
                                    <th className="pb-3 text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                                {tiers.map((tier) => {
                                    const sampleBase = tier.min_investment;
                                    const samplePayout =
                                        Math.round((sampleBase * tier.commission_percent) / 100 * 100) / 100;
                                    const rangeLabel =
                                        tier.max_investment == null
                                            ? `${formatNaira(tier.min_investment)} – No cap`
                                            : `${formatNaira(tier.min_investment)} – ${formatNaira(tier.max_investment)}`;

                                    return (
                                        <tr key={tier.id} className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            <td className="py-4 pr-4">
                                                <p className="font-black uppercase text-slate-900 dark:text-white">{tier.tier_name}</p>
                                                {tier.description && (
                                                    <p className="text-[10px] text-slate-500 font-bold mt-1 max-w-xs">{tier.description}</p>
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 font-mono">{rangeLabel}</td>
                                            <td className="py-4 pr-4">{formatTenureLabel(tier.tenure_days)}</td>
                                            <td className="py-4 pr-4">{tier.commission_percent}%</td>
                                            <td className="py-4 pr-4 font-mono">{formatNaira(samplePayout)}</td>
                                            <td className="py-4 pr-4 text-center">
                                                <span
                                                    className={`inline-flex px-2 py-1 rounded-full text-[9px] font-black uppercase ${
                                                        tier.status === 'active'
                                                            ? 'bg-emerald-500/15 text-emerald-600'
                                                            : 'bg-slate-500/15 text-slate-500'
                                                    }`}
                                                >
                                                    {tier.status}
                                                </span>
                                            </td>
                                            <td className="py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => openEdit(tier)}
                                                        className="p-2 rounded-lg hover:bg-blue-500/10 text-blue-600 transition-colors"
                                                        aria-label="Edit tier"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">edit</span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDelete(tier)}
                                                        className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-600 transition-colors"
                                                        aria-label="Delete tier"
                                                    >
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <AnimatePresence>
                {modalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm"
                        onClick={() => !saving && setModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-lg bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-[2rem] p-8 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">
                                {editingId ? 'Edit commission tier' : 'Add commission tier'}
                            </h3>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tier name / label</label>
                                <input
                                    value={form.tier_name}
                                    onChange={(e) => setForm({ ...form, tier_name: e.target.value })}
                                    placeholder="e.g. Starter 30-Day Tier"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Min investment (₦)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={form.min_investment}
                                        onChange={(e) => setForm({ ...form, min_investment: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max investment (₦)</label>
                                        <label className="flex items-center gap-1 text-[9px] font-black uppercase text-slate-400 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={form.no_max_cap}
                                                onChange={(e) => setForm({ ...form, no_max_cap: e.target.checked })}
                                                className="rounded"
                                            />
                                            No max cap
                                        </label>
                                    </div>
                                    <input
                                        type="number"
                                        min={0}
                                        disabled={form.no_max_cap}
                                        value={form.max_investment}
                                        onChange={(e) => setForm({ ...form, max_investment: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold disabled:opacity-50"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                    Investment duration (tenure in days)
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {TENURE_PRESETS.map((d) => (
                                        <button
                                            key={d}
                                            type="button"
                                            onClick={() => setForm({ ...form, tenure_days: d })}
                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${
                                                form.tenure_days === d ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-800'
                                            }`}
                                        >
                                            {d} Days
                                        </button>
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <input
                                        type="number"
                                        min={1}
                                        value={form.tenure_days}
                                        onChange={(e) => setForm({ ...form, tenure_days: Number(e.target.value) })}
                                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    />
                                    <input
                                        readOnly
                                        value={formatTenureLabel(form.tenure_days)}
                                        className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-500"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Commission percentage (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={100}
                                        step={0.1}
                                        value={form.commission_percent}
                                        onChange={(e) => setForm({ ...form, commission_percent: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tier status</label>
                                    <select
                                        value={form.status}
                                        onChange={(e) => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold"
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rule description / notes</label>
                                <textarea
                                    rows={3}
                                    value={form.description}
                                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                                    placeholder="e.g. ₦100k - ₦1M for 30 days attracts 2% commission"
                                    className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-sm font-bold resize-none"
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={() => setModalOpen(false)}
                                    className="flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 font-black uppercase text-[10px] tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={saving}
                                    onClick={handleSaveTier}
                                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-blue-700 disabled:opacity-50"
                                >
                                    {saving ? 'Saving…' : editingId ? 'Save tier' : 'Create tier'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AgentCommissionSettings;
