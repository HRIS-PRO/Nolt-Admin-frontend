import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import {
    MobileBannerDesigner,
    emptyBannerForm,
    type BannerFormState,
} from '../components/mobile/MobileBannerDesigner';
import {
    PushCampaignComposer,
    emptyCampaignForm,
    type CampaignFormState,
} from '../components/mobile/PushCampaignComposer';
import { CampaignsHubTable, type CampaignRow } from '../components/mobile/CampaignsHubTable';
import { DeliveryAnalyticsPanel } from '../components/mobile/DeliveryAnalyticsPanel';
import { panelClass, staffStatCardClass } from '../components/mobile/push-hub-styles';

interface Banner {
    id: string;
    title: string;
    body: string | null;
    cta_label: string | null;
    cta_url: string | null;
    image_url: string | null;
    sort_order: number;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
}

interface StaffMobileNotificationsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

type HubTab = 'campaigns' | 'banners' | 'analytics';

function toIsoFromLocalInput(value: string): string | null {
    if (!value.trim()) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

function resolveCampaignStatus(form: CampaignFormState): { status: string; scheduled_at: string | null } {
    if (form.dispatchMode === 'immediate') {
        return { status: 'sent', scheduled_at: null };
    }
    if (form.dispatchMode === 'scheduled') {
        const iso = toIsoFromLocalInput(form.scheduled_at);
        return { status: 'scheduled', scheduled_at: iso };
    }
    return { status: 'draft', scheduled_at: null };
}

const StaffMobileNotificationsPage: React.FC<StaffMobileNotificationsPageProps> = ({
    user,
    onLogout,
    toggleTheme,
    theme,
}) => {
    const [tab, setTab] = useState<HubTab>('campaigns');
    const [composing, setComposing] = useState(false);
    const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [campaignForm, setCampaignForm] = useState<CampaignFormState>(emptyCampaignForm);
    const [bannerForm, setBannerForm] = useState<BannerFormState>(emptyBannerForm);

    const fetchCampaigns = useCallback(async () => {
        const res = await axios.get('/api/staff/mobile-notifications/campaigns', { withCredentials: true });
        setCampaigns(res.data.campaigns ?? []);
    }, []);

    const fetchBanners = useCallback(async () => {
        const res = await axios.get('/api/staff/mobile-notifications/banners', { withCredentials: true });
        setBanners(res.data.banners ?? []);
    }, []);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            await Promise.all([fetchCampaigns(), fetchBanners()]);
        } catch (error) {
            console.error('[push-notifications] fetch failed:', error);
        } finally {
            setLoading(false);
        }
    }, [fetchCampaigns, fetchBanners]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const stats = useMemo(
        () => ({
            activeBanners: banners.filter((b) => b.is_active).length,
            totalCampaigns: campaigns.length,
            sent: campaigns.filter((c) => c.status === 'sent').length,
            scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
            drafts: campaigns.filter((c) => c.status === 'draft').length,
        }),
        [banners, campaigns],
    );

    const handleCreateCampaign = async (e: React.FormEvent) => {
        e.preventDefault();

        const { status, scheduled_at } = resolveCampaignStatus(campaignForm);
        if (campaignForm.dispatchMode === 'scheduled' && !scheduled_at) {
            alert('Pick a valid schedule date and time.');
            return;
        }
        if (campaignForm.dispatchMode === 'scheduled' && scheduled_at) {
            if (new Date(scheduled_at).getTime() <= Date.now()) {
                alert('Scheduled time must be in the future.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const deepLink =
                campaignForm.deep_link_mode === '__custom__'
                    ? campaignForm.deep_link.trim() || null
                    : campaignForm.deep_link_mode;

            await axios.post(
                '/api/staff/mobile-notifications/campaigns',
                {
                    title: campaignForm.title.trim(),
                    body: campaignForm.body.trim(),
                    priority: campaignForm.priority,
                    deep_link: deepLink,
                    status,
                    scheduled_at,
                    audience: { all: true },
                },
                { withCredentials: true },
            );

            setCampaignForm(emptyCampaignForm);
            setComposing(false);
            await fetchCampaigns();

            if (status === 'sent') {
                alert('Campaign broadcast started.');
            } else if (status === 'scheduled') {
                alert('Campaign scheduled.');
            }
        } catch (error) {
            console.error('[push-notifications] create campaign:', error);
            const msg = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string })?.message ?? 'Failed to create campaign'
                : 'Failed to create campaign';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSendCampaign = async (id: string) => {
        if (!window.confirm('Broadcast this push to all mobile customers now?')) return;
        setSubmitting(true);
        try {
            await axios.post(`/api/staff/mobile-notifications/campaigns/${id}/send`, {}, { withCredentials: true });
            await fetchCampaigns();
        } catch {
            alert('Failed to send campaign.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCreateBanner = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!bannerForm.image_url) {
            alert('Upload a valid banner image first.');
            return;
        }
        setSubmitting(true);
        try {
            const link =
                bannerForm.link_mode === '__custom__' ? bannerForm.cta_url.trim() : bannerForm.link_mode;

            await axios.post(
                '/api/staff/mobile-notifications/banners',
                {
                    title: bannerForm.title.trim(),
                    image_url: bannerForm.image_url,
                    cta_url: link,
                    cta_label: bannerForm.cta_label.trim() || 'Click me',
                    sort_order: Number(bannerForm.sort_order) || 0,
                    is_active: bannerForm.is_active,
                    starts_at: bannerForm.starts_at || null,
                    ends_at: bannerForm.ends_at || null,
                    audience: { all: true },
                },
                { withCredentials: true },
            );
            setBannerForm(emptyBannerForm);
            await fetchBanners();
        } catch (error) {
            const msg = axios.isAxiosError(error)
                ? (error.response?.data as { message?: string })?.message ?? 'Failed to publish banner'
                : 'Failed to publish banner';
            alert(msg);
        } finally {
            setSubmitting(false);
        }
    };

    const toggleBannerActive = async (banner: Banner) => {
        try {
            await axios.patch(
                `/api/staff/mobile-notifications/banners/${banner.id}`,
                { is_active: !banner.is_active },
                { withCredentials: true },
            );
            await fetchBanners();
        } catch {
            alert('Could not update banner.');
        }
    };

    const hubTabs: { id: HubTab; label: string }[] = [
        { id: 'campaigns', label: 'Campaigns hub' },
        { id: 'banners', label: 'Home banners' },
        { id: 'analytics', label: 'Delivery analytics' },
    ];

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-2">
                        Promotions · Mobile
                    </p>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">
                        Push notification center
                    </h1>
                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Broadcasts, home banners & delivery insights
                    </p>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                        FCM &amp; APNs ready
                    </span>
                </div>
            </div>

            {!loading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                    {[
                        { label: 'Active banners', value: stats.activeBanners, icon: 'view_carousel', tone: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' },
                        { label: 'Total campaigns', value: stats.totalCampaigns, icon: 'campaign', tone: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10' },
                        { label: 'Sent', value: stats.sent, icon: 'send', tone: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' },
                        { label: 'Scheduled', value: stats.scheduled, icon: 'schedule', tone: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10' },
                        { label: 'Drafts', value: stats.drafts, icon: 'draft', tone: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800' },
                    ].map((stat) => (
                        <div key={stat.label} className={staffStatCardClass}>
                            <div className={`size-12 rounded-2xl flex items-center justify-center shrink-0 ${stat.tone}`}>
                                <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {stat.label}
                                </p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                                    {stat.value}
                                </h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-wrap gap-2 mb-8">
                {hubTabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                            setTab(t.id);
                            if (t.id !== 'campaigns') setComposing(false);
                        }}
                        className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                            tab === t.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'bg-white dark:bg-[#1e293b] text-slate-500 border border-slate-200 dark:border-slate-800 hover:text-slate-800 dark:hover:text-white'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className={`${panelClass} py-20 flex justify-center`}>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
            ) : tab === 'campaigns' ? (
                composing ? (
                    <PushCampaignComposer
                        form={campaignForm}
                        onChange={(patch) => setCampaignForm((f) => ({ ...f, ...patch }))}
                        onSubmit={handleCreateCampaign}
                        onCancel={() => {
                            setComposing(false);
                            setCampaignForm(emptyCampaignForm);
                        }}
                        submitting={submitting}
                    />
                ) : (
                    <CampaignsHubTable
                        campaigns={campaigns}
                        onCompose={() => setComposing(true)}
                        onSend={handleSendCampaign}
                        sending={submitting}
                    />
                )
            ) : tab === 'banners' ? (
                <div className="space-y-8">
                    <MobileBannerDesigner
                        form={bannerForm}
                        onChange={(patch) => setBannerForm((f) => ({ ...f, ...patch }))}
                        onSubmit={handleCreateBanner}
                        submitting={submitting}
                    />

                    <div className={`${panelClass} p-8`}>
                        <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">
                            Published banners
                        </h2>
                        <p className="text-sm font-medium text-slate-500 mb-6">
                            Live and paused creatives on the mobile home carousel.
                        </p>

                        {banners.length === 0 ? (
                            <div className="py-16 text-center">
                                <p className="font-bold text-slate-600 dark:text-slate-300">No banners published yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse min-w-[640px]">
                                    <thead>
                                        <tr>
                                            {['Preview', 'Name', 'Destination', 'Order', 'Status'].map((h) => (
                                                <th
                                                    key={h}
                                                    className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-widest"
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {banners.map((banner) => (
                                            <tr
                                                key={banner.id}
                                                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                                            >
                                                <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 w-36">
                                                    {banner.image_url ? (
                                                        <img
                                                            src={banner.image_url}
                                                            alt=""
                                                            className="w-32 aspect-[3/1] object-cover rounded-lg border border-slate-200 dark:border-slate-700"
                                                        />
                                                    ) : (
                                                        <div className="w-32 aspect-[3/1] bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-[10px] text-slate-400">
                                                            No image
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                                    <p className="font-bold text-slate-900 dark:text-white">{banner.title}</p>
                                                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                                                        {banner.cta_label ?? 'Click me'}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 text-xs font-medium text-slate-500 max-w-[180px] truncate">
                                                    {banner.cta_url ?? '—'}
                                                </td>
                                                <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-300 tabular-nums">
                                                    {banner.sort_order}
                                                </td>
                                                <td className="px-4 py-4 border-b border-slate-100 dark:border-slate-800">
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleBannerActive(banner)}
                                                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                                                            banner.is_active
                                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                                        }`}
                                                    >
                                                        {banner.is_active ? 'Live' : 'Paused'}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <DeliveryAnalyticsPanel campaigns={campaigns} banners={banners} />
            )}
        </StaffLayout>
    );
};

export default StaffMobileNotificationsPage;
