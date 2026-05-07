import React, { useEffect, useState } from 'react';
import StaffLayout from '../components/layouts/StaffLayout';
import axios from 'axios';
import CustomerDetailsDrawer from '../components/drawers/CustomerDetailsDrawer';
import NewCustomerModal from '../components/modals/NewCustomerModal';
import { formatDate } from '../utils/dateFormatter';
import { useNavigate } from 'react-router-dom';

interface Customer {
    id: number;
    email: string;
    full_name: string;
    phone_number?: string;
    employer?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    avatar_url?: string;
    state_of_residence?: string;
    last_sign_in_at?: string;
    account_number?: string;
    account_name?: string;
    gender?: string;
    marital_status?: string;
    religion?: string;
    bvn?: string;
    nin?: string;
    date_of_birth?: string;
    primary_home_address?: string;
    bank_name?: string;
    state_of_origin?: string;
    residential_status?: string;
    ippis_number?: string;
    staff_id?: string;
    average_monthly_income?: string;
    mda_tertiary?: string;
    personal_email?: string;
    mobile_number?: string;
    kyc_tier?: number;
    tier_3_status?: string;
}

interface CustomersPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const CustomersPage: React.FC<CustomersPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'verified'>('all');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [drawerCustomerId, setDrawerCustomerId] = useState<number | null>(null);
    const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [totalCustomers, setTotalCustomers] = useState(0);

    const fetchCustomers = async () => {
        setIsLoading(true);
        try {
            // Fetch only users with role='customer'
            const params: any = {
                role: 'customer',
                page: currentPage,
                limit: limit,
                search: searchTerm
            };

            if (activeFilter === 'pending') {
                params.tier_3_status = 'pending';
            } else if (activeFilter === 'verified') {
                params.kyc_tier = 3;
            }

            const res = await axios.get(`/api/staff/users`, {
                params,
                withCredentials: true
            });

            if (res.data.users) {
                setCustomers(res.data.users);
                setTotalCustomers(res.data.total);
            } else {
                setCustomers(res.data);
                setTotalCustomers(res.data.length);
            }

        } catch (error) {
            console.error("Failed to fetch customers", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCustomers();
    }, [currentPage, limit, searchTerm, activeFilter]);

    const toggleSelectAll = () => {
        if (selectedIds.length === customers.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(customers.map(c => c.id));
        }
    };

    const toggleSelectOne = (id: number) => {
        if (selectedIds.includes(id)) {
            setSelectedIds(selectedIds.filter(sid => sid !== id));
        } else {
            setSelectedIds([...selectedIds, id]);
        }
    };

    const navigate = useNavigate();

    const handleRowClick = (id: number) => {
        navigate(`/staff/customers/${id}`);
    };

    const handleCSVExport = async () => {
        setIsLoading(true);
        try {
            // Fetch ALL customers for export (matching search if any)
            const res = await axios.get(`${import.meta.env.VITE_BACKEND_URL || ''}/api/staff/users`, {
                params: {
                    role: 'customer',
                    page: 1,
                    limit: 999999, // Fetch virtually all
                    search: searchTerm
                },
                withCredentials: true
            });

            const allCustomers = res.data.users || res.data || [];

            if (allCustomers.length === 0) {
                alert("No customers to export.");
                return;
            }

            const headers = [
                "ID", "Full Name", "Email", "Phone Number", "Gender", "DOB", "Marital Status", "Religion", "BVN", "NIN",
                "State of Origin", "State of Residence", "Residential Status", "Address", "Employer/MDA", "IPPIS Number", "Staff ID", "Monthly Income",
                "Bank Name", "Account Number", "Account Name", "Role", "Status", "Joined Date"
            ];

            const csvContent = [
                headers.join(","),
                ...allCustomers.map((c: Customer) => {
                    const row = [
                        c.id,
                        `"${c.full_name || ''}"`,
                        `"${c.personal_email || c.email || ''}"`,
                        `"${c.phone_number || c.mobile_number || ''}"`,
                        `"${c.gender || ''}"`,
                        `"${formatDate(c.date_of_birth)}"`,
                        `"${c.marital_status || ''}"`,
                        `"${c.religion || ''}"`,
                        `"${c.bvn || ''}"`,
                        `"${c.nin || ''}"`,
                        `"${c.state_of_origin || ''}"`,
                        `"${c.state_of_residence || ''}"`,
                        `"${c.residential_status || ''}"`,
                        `"${c.primary_home_address?.replace(/"/g, '""') || ''}"`,
                        `"${c.mda_tertiary || c.employer || ''}"`,
                        `"${c.ippis_number || ''}"`,
                        `"${c.staff_id || ''}"`,
                        `"${c.average_monthly_income || ''}"`,
                        `"${c.bank_name || ''}"`,
                        `"${c.account_number || ''}"`,
                        `"${c.account_name || ''}"`,
                        `"${c.role || ''}"`,
                        `"${c.is_active ? 'Active' : 'Inactive'}"`,
                        `"${formatDate(c.created_at)}"`
                    ];
                    return row.join(",");
                })
            ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `customers_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("CSV Export failed:", error);
            alert("Failed to export CSV.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async (exportAll: boolean = false) => {
        let queryString = '';

        if (!exportAll) {
            if (selectedIds.length === 0) {
                alert("Please select customers to export, or choose 'Export All'");
                return;
            }
            queryString = `?ids=${selectedIds.join(',')}`;
        } else {
            // Export All (respecting current search/filter if any, or just all?)
            // Usually "Export All" implies all matching current view or ALL all.
            // The previous logic exported `customers` state which was paginated/filtered.
            // But the backend implementation supports `search`.
            if (searchTerm) {
                queryString = `?search=${encodeURIComponent(searchTerm)}`;
            }
        }

        try {
            // Trigger download
            const link = document.createElement("a");
            link.href = `/api/staff/customers/export-zip${queryString}`;
            link.setAttribute("download", `customers_export.zip`); // Browser might ignore this if content-disposition is set
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Export failed:", error);
            alert("Failed to initiate export.");
        }
    };

    // const filteredCustomers = customers; // Already filtered by backend

    return (
        <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight uppercase">
                        Customer Directory
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium text-sm">
                        Verified customer profiles across all financial products.
                    </p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => handleExport(false)}
                            className="px-4 py-2 rounded-lg bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-600 transition-all"
                        >
                            <span className="material-symbols-outlined text-sm">download</span>
                            Export Selected ({selectedIds.length})
                        </button>
                    )}
                    <button
                        onClick={handleCSVExport}
                        className="px-4 py-2 rounded-lg bg-blue-600/10 text-blue-600 dark:bg-blue-600/20 dark:text-blue-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20"
                    >
                        <span className="material-symbols-outlined text-sm">spreadsheet</span>
                        Export to CSV
                    </button>
                    <button
                        onClick={() => handleExport(true)}
                        className="px-4 py-2 rounded-lg bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-green-500 hover:text-white transition-all border border-green-500/20"
                    >
                        <span className="material-symbols-outlined text-sm">folder_zip</span>
                        Export Docs (ZIP)
                    </button>
                    <button
                        onClick={() => setIsNewCustomerModalOpen(true)}
                        className="px-6 py-2.5 rounded-xl bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-slate-900/20"
                    >
                        <span className="material-symbols-outlined text-lg">person_add</span>
                        New Customer
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="size-14 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">person_add</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Onboarded Customers</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCustomers}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="size-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-2xl">verified</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Verified Customers</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCustomers}</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-[#1e293b] p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5 transition-all hover:shadow-md">
                    <div className="size-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl">military_tech</span>
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tier 3 Customers</p>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{totalCustomers}</p>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 dark:bg-[#0f172a]/50">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        {[
                            { id: 'all', label: 'All Customers', icon: 'groups' },
                            { id: 'pending', label: 'Pending Tier 3', icon: 'assignment_late' },
                            { id: 'verified', label: 'Tier 3 Verified', icon: 'verified' }
                        ].map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveFilter(tab.id as any);
                                    setCurrentPage(1);
                                }}
                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                                    activeFilter === tab.id
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:flex-none">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-sm">search</span>
                            <input
                                type="text"
                                placeholder="Search by name, email, phone..."
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                                className="pl-9 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-72 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[1000px]">
                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-xs uppercase text-slate-500 font-black tracking-wider">
                            <tr>
                                <th className="p-4 w-4">
                                    <input
                                        type="checkbox"
                                        checked={customers.length > 0 && selectedIds.length === customers.length}
                                        onChange={toggleSelectAll}
                                        className="rounded border-slate-300 dark:border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-100 dark:bg-slate-800"
                                    />
                                </th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">KYC Tier</th>
                                <th className="p-4">Employment</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Joined</th>
                                <th className="p-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500">
                                        <div className="inline-block size-6 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
                                    </td>
                                </tr>
                            ) : customers.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                                        No customers found.
                                    </td>
                                </tr>
                            ) : (
                                customers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${selectedIds.includes(customer.id) ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        onClick={() => handleRowClick(customer.id)}
                                    >
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(customer.id)}
                                                onChange={() => toggleSelectOne(customer.id)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="rounded border-slate-300 dark:border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-100 dark:bg-slate-800"
                                            />
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-white border border-slate-200 dark:border-slate-600 shrink-0 overflow-hidden">
                                                    {customer.avatar_url ? (
                                                        <img src={customer.avatar_url} alt={customer.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        customer.full_name ? customer.full_name[0] : '?'
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-xs">{customer.full_name}</p>
                                                    <p className="text-[10px] text-slate-500">ID: {customer.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col">
                                                <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">{customer.email}</span>
                                                <span className="text-[10px] text-slate-500">{customer.phone_number || 'No phone'}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider w-fit ${
                                                    customer.kyc_tier === 3 ? 'bg-blue-500 text-white shadow-sm' :
                                                    customer.kyc_tier === 2 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                                                    customer.kyc_tier === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    Tier {customer.kyc_tier || 0}
                                                </span>
                                                {customer.tier_3_status === 'pending' && (
                                                    <span className="flex items-center gap-1 text-[8px] font-black uppercase text-amber-600 animate-pulse">
                                                        <span className="material-symbols-outlined text-[10px]">info</span>
                                                        Review Pending
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-4 text-slate-600 dark:text-slate-400 font-medium text-xs">
                                            {customer.employer || 'N/A'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${customer.is_active
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                {customer.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-slate-500 text-xs">
                                            {formatDate(customer.created_at)}
                                        </td>
                                        <td className="p-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleRowClick(customer.id); }}
                                                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                                                    customer.tier_3_status === 'pending'
                                                        ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'
                                                        : 'text-blue-500 hover:text-blue-600'
                                                }`}
                                            >
                                                {customer.tier_3_status === 'pending' ? 'Review' : 'View'}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mt-6">
                <div className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    Showing {customers.length > 0 ? (currentPage - 1) * limit + 1 : 0} - {Math.min(currentPage * limit, totalCustomers)} of {totalCustomers} customers
                </div>

                <div className="flex items-center gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                    >
                        Previous
                    </button>

                    <div className="flex items-center gap-1">
                        {Array.from({ length: Math.min(5, Math.ceil(totalCustomers / limit)) }, (_, i) => {
                            let p = i + 1;
                            if (currentPage > 3 && Math.ceil(totalCustomers / limit) > 5) {
                                p = currentPage - 2 + i;
                            }
                            if (p > Math.ceil(totalCustomers / limit)) return null;

                            return (
                                <button
                                    key={p}
                                    onClick={() => setCurrentPage(p)}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs transition-colors
                                        ${currentPage === p
                                            ? 'bg-blue-600 text-white'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        disabled={currentPage * limit >= totalCustomers}
                        onClick={() => setCurrentPage(prev => prev + 1)}
                        className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs uppercase"
                    >
                        Next
                    </button>

                    <select
                        value={limit}
                        onChange={(e) => {
                            setLimit(Number(e.target.value));
                            setCurrentPage(1);
                        }}
                        className="ml-4 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-slate-600 dark:text-slate-400 text-xs font-bold"
                    >
                        <option value="10">10 / page</option>
                        <option value="20">20 / page</option>
                        <option value="50">50 / page</option>
                    </select>
                </div>
            </div>

            {isDrawerOpen && (
                <CustomerDetailsDrawer
                    customerId={drawerCustomerId}
                    onClose={() => setIsDrawerOpen(false)}
                />
            )}

            <NewCustomerModal
                isOpen={isNewCustomerModalOpen}
                onClose={() => setIsNewCustomerModalOpen(false)}
            />
        </StaffLayout>
    );
};

export default CustomersPage;
