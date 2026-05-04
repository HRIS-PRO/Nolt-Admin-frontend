import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import StaffLayout from '../components/layouts/StaffLayout';
import { SavedDraft, UserState, Currency, InvestmentPlan } from '../types';
import { investmentService } from '../services/investmentService';
import { profileService } from '../services/profileService';

interface StaffInvestmentsPageProps {
    user: { name: string; email: string; avatar_url?: string; role?: string };
    onLogout: () => void;
    toggleTheme?: () => void;
    theme?: 'light' | 'dark';
}

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
    "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina",
    "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
    "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const TENURE_VALUES = [30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365];


const StaffInvestmentsPage: React.FC<StaffInvestmentsPageProps> = ({ user, onLogout, toggleTheme, theme }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'applications' | 'rate_guide'>('applications');
    const [showAddRateForm, setShowAddRateForm] = useState(false);
    const [isInfinity, setIsInfinity] = useState(false);
    const [rates, setRates] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [stageFilter, setStageFilter] = useState('all');
    const [entityFilter, setEntityFilter] = useState('all');
    const [officerFilter, setOfficerFilter] = useState('all');
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const [showStaffApplicationFlow, setShowStaffApplicationFlow] = useState(false);
    const [banks, setBanks] = useState<{ name: string; code: string }[]>([]);
    const [isVerifyingBank, setIsVerifyingBank] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [wizardData, setWizardData] = useState({
        // Common Identity
        entityType: 'INDIVIDUAL' as 'INDIVIDUAL' | 'CORPORATE',
        email: '',
        phoneNumber: '',
        bvn: '',
        nin: '',
        tin: '',

        // Individual Profile
        title: 'Mr',
        firstName: '',
        lastName: '',
        middleName: '',
        isPep: false,
        gender: '',
        dob: '',
        maidenName: '',
        religion: 'Prefer not to say',
        maritalStatus: 'Single',

        // Address & NOK
        stateOfOrigin: 'Abia',
        stateOfResidence: 'Abia',
        homeAddress: '',
        nokName: '',
        nokRelationship: '',
        nokAddress: '',
        nokPhoneNumber: '',
        nokCountryCode: '+234',
        isNokSameAddress: false,

        // Corporate Profile
        companyName: '',
        rcNumber: '',
        isAuthorizedRep: false,
        incorpDate: '',
        businessAddress: '',
        businessNature: '',
        directorCount: 1,
        directors: [{
            surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', isPep: false
        }],

        // Bank Details
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',

        // Vault
        uploadedDocs: {} as Record<string, File | string>,

        // Investment Setup
        plan: 'RISE' as InvestmentPlan,
        amount: '',
        targetAmount: '',
        payoutFrequency: 'monthly',
        tenure: '365',
        currency: 'NGN' as Currency,
        rollover: 'principal_interest',
        paymentMethod: 'bank_transfer' as 'bank_transfer' | 'paystack',
        receiptUrl: ''
    });

    useEffect(() => {
        if (wizardData.plan === 'SURGE') {
            setWizardData(prev => ({ ...prev, tenure: '365' }));
        }
    }, [wizardData.plan]);

    const individualDocs = React.useMemo(() => [
        { id: 'gov_id', label: 'Government ID', icon: 'badge', required: true },
        { id: 'utility_bill', label: 'Utility Bill', icon: 'description', required: true },
        { id: 'selfie', label: 'Selfie', icon: 'add_a_photo', required: true },
        { id: 'secondary_id', label: 'Secondary Government ID/Doc', icon: 'assignment_ind', required: false }
    ], []);

    const corporateDocs = React.useMemo(() => {
        const docs: any[] = [];
        wizardData.directors.forEach((director, index) => {
            const name = director.firstName && director.surname ? `${director.firstName} ${director.surname}` : `Director ${index + 1}`;
            docs.push({
                id: `director_photo_${index}`,
                label: `Photo of Director ${index + 1} (${name})`,
                icon: 'account_circle',
                required: true
            });
            docs.push({
                id: `director_id_${index}`,
                label: `ID Card of Director ${index + 1} (${name})`,
                icon: 'badge',
                required: true
            });
        });
        docs.push(
            { id: 'company_profile', label: 'Company Profile', icon: 'business', required: true },
            { id: 'status_report', label: 'CAC/Status Upload', icon: 'analytics', required: true },
            { id: 'memart', label: 'Memorandum & Articles of Association', icon: 'menu_book', required: true },
            { id: 'board_resolution', label: 'Board Resolution of Authority to Transact with NOLT Finance', icon: 'gavel', required: true },
            { id: 'annual_returns', label: 'Evidence of Filing of Annual Returns', icon: 'history_edu', required: true },
            { id: 'utility_bill', label: 'Utility Bill', icon: 'home_work', required: true }
        );
        return docs;
    }, [wizardData.directors]);

    const currentDocs = wizardData.entityType === 'CORPORATE' ? corporateDocs : individualDocs;

    const [rateLoading, setRateLoading] = useState(false);
    const [dynamicInterestRate, setDynamicInterestRate] = useState<number | null>(null);

    useEffect(() => {
        const fetchRate = async () => {
            const numericAmount = parseFloat(wizardData.amount) || 0;
            if (!numericAmount || !wizardData.plan || !wizardData.currency) {
                setDynamicInterestRate(null);
                return;
            }
            setRateLoading(true);
            try {
                const payload: any = {
                    plan: wizardData.plan,
                    currency: wizardData.currency,
                    amount: numericAmount,
                    tenure: wizardData.plan === 'SURGE' ? 365 : (parseInt(wizardData.tenure) || 30)
                };
                if (wizardData.plan === 'VAULT') {
                    payload.payout_frequency = wizardData.payoutFrequency;
                }
                const data = await investmentService.getRate(payload);
                setDynamicInterestRate(data ? data.interest_rate : null);
            } catch (err) {
                console.error("Error fetching rate:", err);
                setDynamicInterestRate(null);
            } finally {
                setRateLoading(false);
            }
        };
        const debounceTimer = setTimeout(fetchRate, 500);
        return () => clearTimeout(debounceTimer);
    }, [wizardData.amount, wizardData.tenure, wizardData.plan, wizardData.currency]);

    const returns = React.useMemo(() => {
        const principal = parseFloat(wizardData.amount) || 0;
        const tenureToUse = wizardData.plan === 'SURGE' ? 365 : (parseInt(wizardData.tenure) || 30);
        const rateToUse = dynamicInterestRate ?? 0;
        const interestEarned = (principal * rateToUse * (tenureToUse / 365)) / 100;
        return { principal, interestEarned, total: principal + interestEarned };
    }, [wizardData.amount, wizardData.tenure, dynamicInterestRate]);

    const initialFormData = {
        plan: 'NOLT Rise',
        currency: 'NGN',
        payoutFrequency: 'monthly',
        tenure: '',
        minAmount: '',
        maxAmount: '',
        interest: ''
    };

    const currencySymbols: Record<string, string> = {
        NGN: '₦',
        USD: '$',
        GBP: '£',
        EUR: '€'
    };

    const [formData, setFormData] = useState(initialFormData);

    const handleCloseForm = () => {
        setShowAddRateForm(false);
        setFormData(initialFormData);
        setIsInfinity(false);
        setEditingId(null);
    };

    const [allInvestments, setAllInvestments] = useState<any[]>([]);

    const fetchInvestments = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/staff/investments');
            setAllInvestments(response.data);
        } catch (error) {
            console.error('Error fetching investments:', error);
        } finally {
            setLoading(false);
        }
    };

    const [officers, setOfficers] = useState<any[]>([]);

    const fetchOfficers = async () => {
        if (['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role || '')) {
            try {
                const response = await axios.get(`/api/staff/users?role=sales_officer&limit=200`, { withCredentials: true });
                setOfficers(response.data.users.filter((u: any) => u.is_active));
            } catch (error) {
                console.error("Failed to fetch officers", error);
            }
        }
    };

    const handleAssignOfficer = async (investmentId: string, officerId: string) => {
        const isUnassign = officerId === 'unassign';
        if (!confirm(isUnassign ? "Are you sure you want to unassign this investment?" : "Are you sure you want to reassign this investment?")) return;
        try {
            await axios.patch(`/api/staff/investments/${investmentId}/assign`, {
                sales_officer_id: isUnassign ? null : officerId
            }, { withCredentials: true });

            // Optimistic Update
            setAllInvestments(prev => prev.map(inv => {
                if (String(inv.id) === String(investmentId)) {
                    if (isUnassign) {
                        return { ...inv, sales_officer_id: null, officer_name: null, officer_email: null };
                    }
                    const officer = officers.find(o => String(o.id) === String(officerId));
                    return { ...inv, sales_officer_id: officerId, officer_name: officer?.full_name, officer_email: officer?.email };
                }
                return inv;
            }));
            alert(isUnassign ? "Investment unassigned successfully" : "Investment reassigned successfully");
        } catch (error: any) {
            alert(error.response?.data?.message || "Operation failed");
        }
    };

    const fetchRates = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/yield-rates');
            setRates(response.data);
        } catch (error) {
            console.error('Error fetching rates:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'rate_guide') {
            fetchRates();
        } else {
            fetchInvestments();
            fetchOfficers();
        }
    }, [activeTab]);

    useEffect(() => {
        const fetchBanks = async () => {
            try {
                const response = await profileService.getBanks();
                if (response.success) {
                    setBanks(response.data);
                }
            } catch (err) {
                console.error("Failed to fetch banks", err);
            }
        };
        fetchBanks();
    }, []);

    useEffect(() => {
        const resolveAccount = async () => {
            const { accountNumber, bankCode, firstName, lastName } = wizardData;
            if (accountNumber?.length === 10 && bankCode) {
                setIsVerifyingBank(true);
                try {
                    const res = await profileService.verifyBank({
                        account_number: accountNumber,
                        bank_code: bankCode,
                        bvn_name: `${firstName} ${lastName}`.trim() || 'Nolt Customer'
                    });
                    if (res.success && res.data?.account_name) {
                        setWizardData(prev => ({ ...prev, accountName: res.data.account_name }));
                    }
                } catch (err) {
                    console.error("Bank verification failed", err);
                } finally {
                    setIsVerifyingBank(false);
                }
            }
        };
        const timer = setTimeout(resolveAccount, 600);
        return () => clearTimeout(timer);
    }, [wizardData.accountNumber, wizardData.bankCode]);

    const handleActivateYieldRate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const min = parseFloat(formData.minAmount);
            const max = isInfinity ? null : parseFloat(formData.maxAmount);

            if (max !== null && max < min) {
                alert(`Maximum amount cannot be less than Minimum amount (${currencySymbols[formData.currency]}${min.toLocaleString()})`);
                setIsSubmitting(false);
                return;
            }

            const payload: any = {
                plan_name: formData.plan,
                currency: formData.currency,
                tenure_days: formData.tenure,
                min_amount: formData.minAmount,
                max_amount: max,
                interest_rate: formData.interest
            };
            if (formData.plan === 'NOLT Vault') {
                payload.payout_frequency = formData.payoutFrequency;
            }

            if (editingId) {
                await axios.put(`/api/yield-rates/${editingId}`, payload);
            } else {
                await axios.post('/api/yield-rates', payload);
            }

            fetchRates();
            handleCloseForm();
        } catch (error: any) {
            console.error('Error saving yield rate:', error);
            const message = error.response?.data?.message || 'Failed to save yield rate. Please check console for details.';
            alert(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEditRate = (rate: any) => {
        setFormData({
            plan: rate.plan_name,
            currency: rate.currency,
            payoutFrequency: rate.payout_frequency || rate.contribution_frequency || 'monthly',
            tenure: rate.tenure_days.toString(),
            minAmount: rate.min_amount.toString(),
            maxAmount: rate.max_amount ? rate.max_amount.toString() : '',
            interest: rate.interest_rate.toString()
        });
        setIsInfinity(!rate.max_amount);
        setEditingId(rate.id);
        setShowAddRateForm(true);
    };

    const handleDuplicateRate = async (rate: any) => {
        try {
            const payload: any = {
                plan_name: rate.plan_name,
                currency: rate.currency,
                tenure_days: 30,
                min_amount: 1,
                max_amount: 2,
                interest_rate: 1
            };
            if (rate.plan_name === 'NOLT Vault') {
                payload.payout_frequency = rate.payout_frequency || rate.contribution_frequency || 'monthly';
            }

            await axios.post('/api/yield-rates', payload);
            fetchRates();
            alert(`Draft duplicated for ${rate.plan_name} (${rate.currency}). You can now edit its details.`);
        } catch (error: any) {
            console.error('Error duplicating rate:', error);
            const message = error.response?.data?.message || 'Failed to duplicate rate.';
            alert(message);
        }
    };

    const handleDeleteRate = async (id: number) => {
        if (window.confirm('Are you sure you want to delete this yield rate?')) {
            try {
                await axios.delete(`/api/yield-rates/${id}`);
                fetchRates();
            } catch (error) {
                console.error('Error deleting rate:', error);
                alert('Failed to delete rate.');
            }
        }
    };

    const handleTopUp = (inv: any) => {
        const plan = inv.investment_type?.includes('VAULT') ? 'VAULT' : inv.investment_type?.includes('SURGE') ? 'SURGE' : 'RISE';
        const draft = {
            id: `T-${Math.floor(Math.random() * 9000) + 1000}`,
            type: 'INVESTMENT',
            subStep: 0,
            label: inv.investment_type || 'NOLT Investment',
            data: {
                isTopUp: true,
                selectedPlan: plan,
                originalInvestmentId: inv.id,
                currency: inv.currency
            },
            updatedAt: Date.now()
        };

        // Navigate to customer investment flow with top-up data
        navigate('/investment', { state: { draft } });
    };

    const resetWizardData = () => {
        setWizardData({
            entityType: 'INDIVIDUAL', email: '', phoneNumber: '', bvn: '', nin: '', tin: '', title: 'Mr', firstName: '', lastName: '', middleName: '', isPep: false, gender: '', dob: '', maidenName: '', religion: 'Prefer not to say', maritalStatus: 'Single', stateOfOrigin: 'Abia', stateOfResidence: 'Abia', homeAddress: '', nokName: '', nokRelationship: '', nokAddress: '', nokPhoneNumber: '', nokCountryCode: '+234', isNokSameAddress: false, companyName: '', rcNumber: '', isAuthorizedRep: false, incorpDate: '', businessAddress: '', businessNature: '', directorCount: 1, directors: [{ surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', isPep: false }], bankName: '', bankCode: '', accountNumber: '', accountName: '',
            uploadedDocs: {}, plan: 'RISE', amount: '', targetAmount: '', payoutFrequency: 'monthly', tenure: '365', currency: 'NGN', rollover: 'principal_interest', paymentMethod: 'bank_transfer', receiptUrl: ''
        });
        setWizardStep(1);
    };

    const validateStep = (step: number) => {
        const d = wizardData;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (step === 1) {
            if (d.entityType === 'INDIVIDUAL') {
                if (!d.firstName || !d.lastName) { alert("First name and Surname are required"); return false; }
                if (!d.gender) { alert("Gender is required"); return false; }
                if (!d.dob) { alert("Date of Birth is required"); return false; }
                if (!d.email || !emailRegex.test(d.email)) { alert("A valid email is required"); return false; }
                if (!d.phoneNumber || d.phoneNumber.length < 11) { alert("Valid 11-digit phone number is required"); return false; }
                if (!d.bvn || d.bvn.length < 11) { alert("Valid 11-digit BVN is required"); return false; }
                if (!d.nin || d.nin.length < 11) { alert("Valid 11-digit NIN is required"); return false; }
            } else {
                if (!d.companyName) { alert("Company name is required"); return false; }
                if (!d.email || !emailRegex.test(d.email)) { alert("A valid company email is required"); return false; }
                if (!d.rcNumber) { alert("RC Number is required"); return false; }
                if (!d.incorpDate) { alert("Incorporation Date is required"); return false; }
                if (!d.businessNature) { alert("Nature of Business is required"); return false; }
                if (!d.businessAddress) { alert("Business Address is required"); return false; }
            }
        }

        if (step === 2) {
            if (wizardData.entityType === 'INDIVIDUAL') {
                if (!d.homeAddress) { alert("Home address is required"); return false; }
                if (!d.nokName || !d.nokRelationship || !d.nokAddress || !d.nokPhoneNumber) { alert("All Next of Kin details are required"); return false; }
            }
            if (!d.bankName || !d.accountNumber || d.accountNumber.length < 10) { alert("Valid bank details (10-digit account) are required"); return false; }
            if (!d.accountName) { alert("Account name must be resolved before proceeding"); return false; }
        }

        if (step === 3) {
            const missing = currentDocs.filter(doc => doc.required && !d.uploadedDocs[doc.id]);
            if (missing.length > 0) {
                alert(`Missing required documents: ${missing.map(m => m.label).join(', ')}`);
                return false;
            }
        }

        if (step === 4) {
            if (!d.amount || parseFloat(d.amount) <= 0) { alert("Investment amount must be greater than zero"); return false; }
            if (!d.tenure || parseInt(d.tenure) < 30) { alert("Tenure must be at least 30 days"); return false; }
            if (dynamicInterestRate === null) { alert("No valid interest rate found for this configuration. Please adjust amount or tenure."); return false; }
        }

        return true;
    };

    const executeSubmission = async (paymentRef?: string) => {
        try {
            setIsSubmitting(true);
            const payload = {
                entity_type: wizardData.entityType,
                selectedPlan: wizardData.plan,
                amount: parseFloat(wizardData.amount),
                target_amount: wizardData.targetAmount ? parseFloat(wizardData.targetAmount) : null,
                tenure_days: parseInt(wizardData.tenure),
                ...((wizardData.plan === 'VAULT') ? { payout_frequency: wizardData.payoutFrequency } : {}),
                currency: wizardData.currency,
                rollover_option: wizardData.rollover,
                interest_rate: dynamicInterestRate,

                // Common Contact
                email: wizardData.email,
                phone: wizardData.phoneNumber,
                bvn: wizardData.bvn,
                nin: wizardData.nin,
                tin: wizardData.tin,
                homeAddress: wizardData.homeAddress,
                stateOfOrigin: wizardData.stateOfOrigin,
                stateOfResidence: wizardData.stateOfResidence,

                // Identity
                title: wizardData.title,
                fullName: `${wizardData.firstName} ${wizardData.middleName} ${wizardData.lastName}`.trim(),
                gender: wizardData.gender,
                dob: wizardData.dob,
                marital_status: wizardData.maritalStatus,
                religion: wizardData.religion,
                mother_maiden_name: wizardData.maidenName,
                nokName: wizardData.nokName,
                nokRelationship: wizardData.nokRelationship,
                nokAddress: wizardData.nokAddress,
                nok_phone_number: `${wizardData.nokCountryCode}${wizardData.nokPhoneNumber}`,

                // Bank
                bankName: wizardData.bankName,
                accountNumber: wizardData.accountNumber,
                accountName: wizardData.accountName,

                // Corporate
                companyName: wizardData.companyName,
                rcNumber: wizardData.rcNumber,
                businessAddress: wizardData.businessAddress,
                businessNature: wizardData.businessNature,
                directors: wizardData.directors,

                // Document URLs
                rep_id_url: wizardData.uploadedDocs['gov_id'],
                rep_selfie_url: wizardData.uploadedDocs['selfie'],
                kyc_docs_url: wizardData.uploadedDocs['utility_bill'],
                utility_bill_url: wizardData.uploadedDocs['utility_bill'],
                secondary_id_url: wizardData.uploadedDocs['secondary_id'],
                payment_receipt_url: wizardData.receiptUrl,

                // Corporate Specific Documents
                company_profile_url: wizardData.uploadedDocs['company_profile'],
                status_report_url: wizardData.uploadedDocs['status_report'],
                memart_url: wizardData.uploadedDocs['memart'],
                annual_returns_url: wizardData.uploadedDocs['annual_returns'],
                board_resolution_url: wizardData.uploadedDocs['board_resolution'],
                cac_url: wizardData.uploadedDocs['cac_certificate'],

                // Payment
                payment_method: wizardData.paymentMethod,
                payment_reference: paymentRef || `STAFF_${Date.now()}`,
                receipt_url: wizardData.receiptUrl
            };

            await axios.post('/api/staff/investments/application', payload);
            setShowStaffApplicationFlow(false);
            resetWizardData();
            fetchInvestments();
            alert("Investment application created successfully!");
        } catch (error: any) {
            console.error("Submission error:", error);
            alert(error.response?.data?.message || "Failed to create investment application");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleWizardSubmit = async () => {
        if (wizardData.paymentMethod === 'paystack') {
            try {
                setIsSubmitting(true);
                // @ts-ignore
                const handler = window.PaystackPop.setup({
                    key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                    email: wizardData.email,
                    amount: Math.round(parseFloat(wizardData.amount) * 100),
                    currency: wizardData.currency || 'NGN',
                    ref: `STAFF_${Date.now()}`,
                    metadata: {
                        custom_fields: [
                            { display_name: "Staff Email", variable_name: "staff_email", value: user.email },
                            { display_name: "Customer Name", variable_name: "customer_name", value: `${wizardData.firstName} ${wizardData.lastName}` }
                        ]
                    },
                    callback: (response: any) => {
                        executeSubmission(response.reference);
                    },
                    onClose: () => {
                        setIsSubmitting(false);
                        alert('Payment window closed. Please try again.');
                    }
                });
                handler.openIframe();
            } catch (err) {
                console.error("Paystack initialization failed:", err);
                alert("Failed to initialize payment gateway.");
                setIsSubmitting(false);
            }
        } else {
            await executeSubmission();
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldId: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setWizardData(prev => ({ ...prev, uploadedDocs: { ...prev.uploadedDocs, [fieldId]: 'uploading...' } }));
            const uploadResult = await investmentService.uploadDocument(file, `STAFF-${wizardData.email || Date.now()}`, fieldId);
            setWizardData(prev => ({
                ...prev,
                uploadedDocs: { ...prev.uploadedDocs, [fieldId]: uploadResult.document.file_url }
            }));
        } catch (error) {
            console.error("Upload failed", error);
            alert("File upload failed. Please try again.");
            setWizardData(prev => ({ ...prev, uploadedDocs: { ...prev.uploadedDocs, [fieldId]: '' } }));
        }
    };

    return (
        <div className="relative">
            {showStaffApplicationFlow && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowStaffApplicationFlow(false)} />
                    <div className="relative w-full max-w-2xl bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex h-full flex-col">
                            {/* Header */}
                            <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
                                <div className="flex items-center gap-4">
                                    <div className="size-12 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
                                        <span className="material-symbols-outlined filled">add_circle</span>
                                    </div>
                                    <div>
                                        <h2 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">Quick Application</h2>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Step {wizardStep} of 5</span>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <div key={s} className={`h-1 w-3 rounded-full transition-all ${s <= wizardStep ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => setShowStaffApplicationFlow(false)} className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 hover:text-rose-500 transition-colors border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm">
                                    <span className="material-symbols-outlined">close</span>
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-10 max-h-[70vh] overflow-y-auto">
                                {wizardStep === 1 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Entity Type</label>
                                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                                    <button
                                                        onClick={() => setWizardData({ ...wizardData, entityType: 'INDIVIDUAL' })}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${wizardData.entityType === 'INDIVIDUAL' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500'}`}
                                                    >Individual</button>
                                                    <button
                                                        onClick={() => setWizardData({ ...wizardData, entityType: 'CORPORATE' })}
                                                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${wizardData.entityType === 'CORPORATE' ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500'}`}
                                                    >Corporate</button>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Customer Email</label>
                                                <input
                                                    type="email"
                                                    placeholder="customer@example.com"
                                                    value={wizardData.email}
                                                    onChange={e => setWizardData({ ...wizardData, email: e.target.value })}
                                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm"
                                                />
                                            </div>
                                        </div>

                                        {wizardData.entityType === 'INDIVIDUAL' ? (
                                            <div className="space-y-6 animate-in fade-in">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                    <span className="material-symbols-outlined text-purple-500 text-lg">person</span>
                                                    <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Personal Details</h3>
                                                </div>
                                                <div className="grid grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Title</label>
                                                        <select value={wizardData.title} onChange={e => setWizardData({ ...wizardData, title: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                            <option value="Mr">Mr</option>
                                                            <option value="Mrs">Mrs</option>
                                                            <option value="Ms">Ms</option>
                                                            <option value="Dr">Dr</option>
                                                            <option value="Prof">Prof</option>
                                                            <option value="Chief">Chief</option>
                                                        </select>
                                                    </div>
                                                    <div className="col-span-2 space-y-2 flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl">
                                                        <div>
                                                            <p className="text-sm font-black text-slate-900 dark:text-white">Politically Exposed Person (PEP)?</p>
                                                            <p className="text-[10px] font-bold text-slate-500">Is this person a senior politician or affiliated with one?</p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={() => setWizardData({ ...wizardData, isPep: true })} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${wizardData.isPep ? 'bg-purple-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>Yes</button>
                                                            <button onClick={() => setWizardData({ ...wizardData, isPep: false })} className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all ${!wizardData.isPep ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>No</button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">First Name</label>
                                                        <input type="text" value={wizardData.firstName} onChange={e => setWizardData({ ...wizardData, firstName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Middle Name (Optional)</label>
                                                        <input type="text" value={wizardData.middleName} onChange={e => setWizardData({ ...wizardData, middleName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Surname</label>
                                                        <input type="text" value={wizardData.lastName} onChange={e => setWizardData({ ...wizardData, lastName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Gender</label>
                                                        <select value={wizardData.gender} onChange={e => setWizardData({ ...wizardData, gender: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                            <option value="">Select Gender</option>
                                                            <option value="Male">Male</option>
                                                            <option value="Female">Female</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Date of Birth</label>
                                                        <input type="date" value={wizardData.dob} onChange={e => setWizardData({ ...wizardData, dob: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Mother's Maiden Name</label>
                                                        <input type="text" value={wizardData.maidenName} onChange={e => setWizardData({ ...wizardData, maidenName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-4 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Religion</label>
                                                        <select value={wizardData.religion} onChange={e => setWizardData({ ...wizardData, religion: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                            <option value="Christianity">Christianity</option>
                                                            <option value="Islam">Islam</option>
                                                            <option value="Prefer not to say">Prefer not to say</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Marital Status</label>
                                                        <select value={wizardData.maritalStatus} onChange={e => setWizardData({ ...wizardData, maritalStatus: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                            <option value="Single">Single</option>
                                                            <option value="Married">Married</option>
                                                            <option value="Divorced">Divorced</option>
                                                            <option value="Widowed">Widowed</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Phone Number</label>
                                                        <input type="tel" value={wizardData.phoneNumber} onChange={e => setWizardData({ ...wizardData, phoneNumber: e.target.value.replace(/\D/g, "").slice(0, 11) })} maxLength={11} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">BVN (Bank Verification Number)</label>
                                                        <input type="text" value={wizardData.bvn} onChange={e => setWizardData({ ...wizardData, bvn: e.target.value.replace(/\D/g, "").slice(0, 11) })} maxLength={11} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">NIN (National Identity Number)</label>
                                                        <input type="text" value={wizardData.nin} onChange={e => setWizardData({ ...wizardData, nin: e.target.value.replace(/\D/g, "").slice(0, 11) })} maxLength={11} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-6 animate-in fade-in">
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                                    <span className="material-symbols-outlined text-purple-500 text-lg">domain</span>
                                                    <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Corporate Details</h3>
                                                </div>

                                                <div className="grid grid-cols-2 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Company / Organization Name</label>
                                                        <input type="text" value={wizardData.companyName} onChange={e => setWizardData({ ...wizardData, companyName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Company Email</label>
                                                        <input type="email" value={wizardData.email} onChange={e => setWizardData({ ...wizardData, email: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-6">
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Date of Incorporation</label>
                                                        <input type="date" value={wizardData.incorpDate} onChange={e => setWizardData({ ...wizardData, incorpDate: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">RC Number</label>
                                                        <input type="text" value={wizardData.rcNumber} onChange={e => setWizardData({ ...wizardData, rcNumber: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="text-[10px] font-black uppercase text-slate-400 px-1">Nature of Business</label>
                                                        <input type="text" value={wizardData.businessNature} onChange={e => setWizardData({ ...wizardData, businessNature: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                    </div>
                                                </div>

                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Registered Business Address</label>
                                                    <input type="text" value={wizardData.businessAddress} onChange={e => setWizardData({ ...wizardData, businessAddress: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                                </div>

                                                <div className="mt-8 flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-purple-500 text-lg">groups</span>
                                                        <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Directors Setup</h3>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <label className="text-[10px] font-black uppercase text-slate-400">Total Directors:</label>
                                                        <select
                                                            value={wizardData.directorCount}
                                                            onChange={e => {
                                                                const newCount = parseInt(e.target.value);
                                                                let dirs = [...wizardData.directors];
                                                                if (newCount > dirs.length) {
                                                                    for (let i = dirs.length; i < newCount; i++) {
                                                                        dirs.push({ surname: '', firstName: '', middleName: '', phone: '', gender: '', dob: '', bvn: '', nin: '', isPep: false });
                                                                    }
                                                                } else {
                                                                    dirs = dirs.slice(0, newCount);
                                                                }
                                                                setWizardData({ ...wizardData, directorCount: newCount, directors: dirs });
                                                            }}
                                                            className="h-10 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 font-bold text-sm outline-none cursor-pointer border-none"
                                                        >
                                                            {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-4">
                                                    {wizardData.directors.map((dir, idx) => (
                                                        <div key={idx} className="p-6 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-4 relative">
                                                            <div className="absolute -top-3 -left-3 size-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-black text-xs shadow-lg">#{idx + 1}</div>
                                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 px-1">First Name</label>
                                                                    <input type="text" value={dir.firstName} onChange={e => { const nd = [...wizardData.directors]; nd[idx].firstName = e.target.value; setWizardData({ ...wizardData, directors: nd }); }} className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 px-1">Surname</label>
                                                                    <input type="text" value={dir.surname} onChange={e => { const nd = [...wizardData.directors]; nd[idx].surname = e.target.value; setWizardData({ ...wizardData, directors: nd }); }} className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 px-1">Phone</label>
                                                                    <input type="tel" value={dir.phone} onChange={e => { const nd = [...wizardData.directors]; nd[idx].phone = e.target.value.replace(/\D/g, "").slice(0, 11); setWizardData({ ...wizardData, directors: nd }); }} maxLength={11} className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <label className="text-[9px] font-black uppercase text-slate-400 px-1">DOB</label>
                                                                    <input type="date" value={dir.dob} onChange={e => { const nd = [...wizardData.directors]; nd[idx].dob = e.target.value; setWizardData({ ...wizardData, directors: nd }); }} className="w-full h-12 px-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold" />
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 text-xs font-bold text-slate-500">
                                                                <label className="flex items-center gap-2 cursor-pointer hover:text-slate-800 dark:hover:text-white transition-colors">
                                                                    <input type="checkbox" checked={dir.isPep} onChange={e => { const nd = [...wizardData.directors]; nd[idx].isPep = e.target.checked; setWizardData({ ...wizardData, directors: nd }); }} className="rounded accent-purple-600 size-4" />
                                                                    Politically Exposed Person?
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {wizardStep === 2 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        {wizardData.entityType === 'INDIVIDUAL' && (
                                            <>
                                                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-purple-500 text-lg">home</span>
                                            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Address & Contact</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">State of Origin</label>
                                                <select value={wizardData.stateOfOrigin} onChange={e => setWizardData({ ...wizardData, stateOfOrigin: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                    {NIGERIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">State of Residence</label>
                                                <select value={wizardData.stateOfResidence} onChange={e => setWizardData({ ...wizardData, stateOfResidence: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                    {NIGERIAN_STATES.map(state => <option key={state} value={state}>{state}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Home Address</label>
                                            <input type="text" placeholder="House number, Street, City" value={wizardData.homeAddress} onChange={e => setWizardData({ ...wizardData, homeAddress: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                        </div>

                                        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-purple-500 text-lg">family_history</span>
                                            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Next of Kin</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Full Name</label>
                                                <input type="text" value={wizardData.nokName} onChange={e => setWizardData({ ...wizardData, nokName: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Relationship</label>
                                                <select 
                                                    value={wizardData.nokRelationship} 
                                                    onChange={e => setWizardData({ ...wizardData, nokRelationship: e.target.value })} 
                                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none"
                                                >
                                                    <option value="">Select Relationship</option>
                                                    <option value="Spouse">Spouse</option>
                                                    <option value="Parent">Parent</option>
                                                    <option value="Child">Child</option>
                                                    <option value="Brother">Brother</option>
                                                    <option value="Sister">Sister</option>
                                                    <option value="Nephew">Nephew</option>
                                                    <option value="Niece">Niece</option>
                                                    <option value="Uncle">Uncle</option>
                                                    <option value="Aunt">Aunt</option>
                                                    <option value="Cousin">Cousin</option>
                                                    <option value="Grandparent">Grandparent</option>
                                                    <option value="Grandchild">Grandchild</option>
                                                    <option value="Business Partner">Business Partner</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2 col-span-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Phone Number</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="+234"
                                                        value={wizardData.nokCountryCode}
                                                        onChange={e => setWizardData({ ...wizardData, nokCountryCode: e.target.value })}
                                                        className="w-20 h-14 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm"
                                                    />
                                                    <input
                                                        type="tel"
                                                        placeholder="8012345678"
                                                        value={wizardData.nokPhoneNumber}
                                                        onChange={e => setWizardData({ ...wizardData, nokPhoneNumber: e.target.value.replace(/\D/g, "") })}
                                                        className="flex-1 h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase text-slate-400">Home Address</label>
                                                <label className="flex items-center gap-2 cursor-pointer text-[10px] font-black text-purple-600 uppercase">
                                                    <input type="checkbox" checked={wizardData.isNokSameAddress} onChange={e => setWizardData({ ...wizardData, isNokSameAddress: e.target.checked, nokAddress: e.target.checked ? wizardData.homeAddress : '' })} className="size-3 rounded accent-purple-600" />
                                                    Same as Customer Address
                                                </label>
                                            </div>
                                            <input type="text" value={wizardData.nokAddress} onChange={e => setWizardData({ ...wizardData, nokAddress: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" />
                                        </div>

                                            </>
                                        )}

                                        <div className="flex items-center gap-2 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <span className="material-symbols-outlined text-purple-500 text-lg">account_balance</span>
                                            <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-widest">Payout Bank Details</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Bank Name</label>
                                                <select
                                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none"
                                                    value={wizardData.bankCode}
                                                    onChange={e => {
                                                        const selectedBank = banks.find(b => b.code === e.target.value);
                                                        setWizardData({ ...wizardData, bankCode: e.target.value, bankName: selectedBank?.name || '' });
                                                    }}
                                                >
                                                    <option value="">Select Bank</option>
                                                    {banks.map(bank => (
                                                        <option key={bank.code} value={bank.code}>{bank.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Account Number</label>
                                                <div className="relative">
                                                    <input
                                                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm"
                                                        value={wizardData.accountNumber}
                                                        onChange={e => setWizardData({ ...wizardData, accountNumber: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                                                        maxLength={10}
                                                        placeholder="10 digits"
                                                    />
                                                    {isVerifyingBank && (
                                                        <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                                            <div className="size-4 border-2 border-purple-600/20 border-t-purple-600 rounded-full animate-spin" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-1 flex items-center justify-between">
                                                <span>Account Name</span>
                                                {isVerifyingBank && <span className="text-[8px] text-purple-600 animate-pulse uppercase">Resolving Account...</span>}
                                            </label>
                                            <input
                                                className={`w-full h-14 px-5 rounded-2xl transition-all font-bold text-sm ${isVerifyingBank ? 'bg-purple-50 dark:bg-purple-900/10' : 'bg-slate-50 dark:bg-slate-800'} border-none focus:ring-2 focus:ring-purple-500 shadow-sm`}
                                                value={wizardData.accountName}
                                                onChange={e => setWizardData({ ...wizardData, accountName: e.target.value })}
                                                placeholder={isVerifyingBank ? "Resolving..." : "Resolved account name"}
                                                readOnly={isVerifyingBank}
                                            />
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 3 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="flex items-center gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                                            <div className="size-10 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
                                                <span className="material-symbols-outlined filled">security</span>
                                            </div>
                                            <div>
                                                <h3 className="font-black text-sm uppercase text-slate-800 dark:text-slate-200 tracking-tight">Secure Vault</h3>
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mandatory Verification Documents</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentDocs.map(doc => (
                                                <div key={doc.id} className="p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col gap-4 relative overflow-hidden group">
                                                    <div className="flex items-center justify-between">
                                                        <div className="size-10 rounded-xl bg-white dark:bg-slate-800 text-slate-400 group-hover:text-purple-600 transition-colors flex items-center justify-center shadow-sm">
                                                            <span className="material-symbols-outlined">{doc.icon}</span>
                                                        </div>
                                                        {wizardData.uploadedDocs[doc.id] === 'uploading...' ? (
                                                            <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-[10px] font-black uppercase animate-pulse">Uploading...</div>
                                                        ) : wizardData.uploadedDocs[doc.id] ? (
                                                            <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                                Uploaded
                                                            </div>
                                                        ) : (
                                                            <div className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-500 rounded-lg text-[10px] font-black uppercase">Pending</div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-tight line-clamp-1">{doc.label}</h4>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{doc.required ? 'Required' : 'Optional'}</p>
                                                    </div>
                                                    <input
                                                        type="file"
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                        onChange={(e) => handleFileUpload(e, doc.id)}
                                                    />
                                                    {wizardData.uploadedDocs[doc.id] && wizardData.uploadedDocs[doc.id] !== 'uploading...' && (
                                                        <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[1px] pointer-events-none border-2 border-emerald-500/20 rounded-[24px]" />
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 4 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Investment Plan</label>
                                                <select value={wizardData.plan} onChange={e => setWizardData({ ...wizardData, plan: e.target.value as InvestmentPlan })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                    <option value="RISE">RISE (Standard)</option>
                                                    <option value="SURGE">SURGE (Compounding)</option>
                                                    <option value="VAULT">VAULT (Fixed)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Currency</label>
                                                <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                                    {(['NGN', 'USD'] as Currency[]).map(c => (
                                                        <button key={c} onClick={() => setWizardData({ ...wizardData, currency: c })} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${wizardData.currency === c ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm' : 'text-slate-500'}`}>{c}</button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Investment Amount</label>
                                                <div className="relative">
                                                    <span className="absolute left-5 top-1/2 -translate-y-1/2 font-black text-slate-400">{wizardData.currency === 'NGN' ? '₦' : '$'}</span>
                                                    <input type="number" value={wizardData.amount} onChange={e => setWizardData({ ...wizardData, amount: e.target.value })} className="w-full h-14 pl-10 pr-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" placeholder="0.00" />
                                                </div>
                                            </div>
                                            {wizardData.plan !== 'SURGE' && (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center px-1">
                                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tenure (Days)</label>
                                                        <span className="text-xs font-black text-purple-600">{wizardData.tenure} Days</span>
                                                    </div>
                                                    <div className="relative pt-2">
                                                        <input
                                                            type="range"
                                                            min="0"
                                                            max={TENURE_VALUES.length - 1}
                                                            step="1"
                                                            value={TENURE_VALUES.indexOf(parseInt(wizardData.tenure)) !== -1 ? TENURE_VALUES.indexOf(parseInt(wizardData.tenure)) : TENURE_VALUES.length - 1}
                                                            onChange={(e) => {
                                                                const newTenure = TENURE_VALUES[parseInt(e.target.value)];
                                                                setWizardData({ ...wizardData, tenure: newTenure.toString() });
                                                            }}
                                                            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                        />
                                                        <div className="flex justify-between mt-2 px-1">
                                                            <span className="text-[9px] font-bold text-slate-400">30D</span>
                                                            <span className="text-[9px] font-bold text-slate-400">180D</span>
                                                            <span className="text-[9px] font-bold text-slate-400">365D</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase text-slate-400 px-1">Target Amount (Optional)</label>
                                                <input type="number" value={wizardData.targetAmount} onChange={e => setWizardData({ ...wizardData, targetAmount: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm" placeholder="Goal amount" />
                                            </div>
                                            {wizardData.plan === 'VAULT' && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase text-slate-400 px-1">Payout Frequency</label>
                                                    <select value={wizardData.payoutFrequency} onChange={e => setWizardData({ ...wizardData, payoutFrequency: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                        <option value="upfront">Upfront</option>
                                                        <option value="monthly">Monthly</option>
                                                        <option value="quarterly">Quarterly</option>
                                                        <option value="maturity">At Maturity</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Rollover Instructions</label>
                                            <select value={wizardData.rollover} onChange={e => setWizardData({ ...wizardData, rollover: e.target.value })} className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 focus:ring-purple-500 transition-all font-bold text-sm appearance-none">
                                                <option value="principal_interest">Rollover Principal + Interest</option>
                                                <option value="principal_only">Rollover Principal Only (Pay out interest)</option>
                                                <option value="none">Payout All (No Rollover)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {wizardStep === 5 && (
                                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                                        <div className="p-8 rounded-[32px] bg-slate-900 text-white space-y-6 shadow-2xl relative overflow-hidden">
                                            <div className="absolute top-0 right-0 p-8 opacity-10">
                                                <span className="material-symbols-outlined text-8xl">account_balance_wallet</span>
                                            </div>
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em] text-purple-400">Application Summary</h4>
                                            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                                                    <p className="font-bold text-sm uppercase truncate">{wizardData.entityType === 'CORPORATE' ? wizardData.companyName : `${wizardData.firstName} ${wizardData.lastName}`}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Email / Phone</p>
                                                    <p className="font-bold text-[10px] truncate">{wizardData.email}</p>
                                                    <p className="font-bold text-[10px] truncate text-slate-400">{wizardData.phoneNumber}</p>
                                                </div>

                                                <div className="col-span-2 h-px bg-slate-800 my-1" />

                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Payout Bank</p>
                                                    <p className="font-bold text-[11px] text-purple-200">{wizardData.bankName} - {wizardData.accountNumber}</p>
                                                    <p className="text-[10px] font-black text-slate-500 uppercase">{wizardData.accountName}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Next of Kin</p>
                                                    <p className="font-bold text-[11px]">{wizardData.nokName}</p>
                                                    <p className="text-[9px] font-bold text-slate-500">{wizardData.nokRelationship}</p>
                                                </div>

                                                <div className="col-span-2 h-px bg-slate-800 my-1" />

                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Plan & Tenure</p>
                                                    <p className="font-bold text-sm text-purple-300">NOLT {wizardData.plan} ({wizardData.tenure} Days)</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Interest Rate</p>
                                                    <p className="font-black text-sm text-purple-400">{dynamicInterestRate ? `${dynamicInterestRate}% p.a` : 'Fetching...'}</p>
                                                </div>

                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Principal Amount</p>
                                                    <p className="font-black text-xl">{wizardData.currency === 'NGN' ? '₦' : '$'}{Number(wizardData.amount).toLocaleString()}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estimated Returns</p>
                                                    <p className="font-black text-xl text-emerald-400">+{wizardData.currency === 'NGN' ? '₦' : '$'}{returns.interestEarned.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[10px] font-black uppercase text-slate-400 px-1">Select Payment Method</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <button onClick={() => setWizardData({ ...wizardData, paymentMethod: 'bank_transfer' })} className={`flex flex-col items-center gap-3 p-6 rounded-[24px] border-2 transition-all ${wizardData.paymentMethod === 'bank_transfer' ? 'border-purple-600 bg-purple-600/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                    <span className="material-symbols-outlined text-3xl">account_balance</span>
                                                    <span className="font-black text-[10px] uppercase">Bank Transfer</span>
                                                </button>
                                                <button onClick={() => setWizardData({ ...wizardData, paymentMethod: 'paystack' })} className={`flex flex-col items-center gap-3 p-6 rounded-[24px] border-2 transition-all ${wizardData.paymentMethod === 'paystack' ? 'border-purple-600 bg-purple-600/5' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                                                    <span className="material-symbols-outlined text-3xl">payments</span>
                                                    <span className="font-black text-[10px] uppercase">Paystack Online</span>
                                                </button>
                                            </div>
                                        </div>

                                        {wizardData.paymentMethod === 'bank_transfer' && (
                                            <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[32px] flex flex-col items-center gap-4 hover:border-purple-600/30 transition-colors bg-slate-50/50 dark:bg-slate-900/30 relative animate-in zoom-in-95 duration-300">
                                                <input type="file" onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    try {
                                                        const res = await investmentService.uploadDocument(file, `RECEIPT-${wizardData.email}`, 'receipt');
                                                        setWizardData({ ...wizardData, receiptUrl: res.document.file_url });
                                                    } catch (err) { alert("Receipt upload failed"); }
                                                }} className="absolute inset-0 opacity-0 cursor-pointer" />
                                                <div className="size-16 rounded-2xl bg-purple-600/10 text-purple-600 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl">receipt_long</span>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight">Upload Payment Proof</p>
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Required for manual bank transfers</p>
                                                </div>
                                                {wizardData.receiptUrl && <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 animate-in fade-in">Proof Attached <span className="material-symbols-outlined text-xs">check_circle</span></div>}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex gap-4">
                                {wizardStep > 1 && (
                                    <button
                                        onClick={() => setWizardStep(wizardStep - 1)}
                                        className="flex-1 h-14 rounded-2xl bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all font-bold"
                                    >Back</button>
                                )}
                                <button
                                    onClick={() => {
                                        if (validateStep(wizardStep)) {
                                            if (wizardStep < 5) setWizardStep(wizardStep + 1);
                                            else handleWizardSubmit();
                                        }
                                    }}
                                    disabled={isSubmitting || (wizardStep === 5 && wizardData.paymentMethod === 'bank_transfer' && !wizardData.receiptUrl)}
                                    className="flex-[2] h-14 rounded-2xl bg-purple-600 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-purple-600/20 hover:bg-purple-700 transition-all active:scale-95 disabled:opacity-50 font-black"
                                >
                                    {isSubmitting ? 'Processing...' : (wizardStep === 5 ? 'Submit Application' : 'Continue')}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <StaffLayout user={user} onLogout={onLogout} toggleTheme={toggleTheme} theme={theme}>
                <div className="space-y-8">
                    {/* Header with Tabs */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                Investments
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                Manage investment portfolios and rates.
                            </p>
                        </div>
                        <div className="flex p-1 bg-slate-200/50 dark:bg-slate-800/50 rounded-2xl backdrop-blur-sm shadow-inner">
                            <button
                                onClick={() => { setActiveTab('applications'); handleCloseForm(); }}
                                className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'applications'
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                APPLICATIONS
                            </button>
                            <button
                                onClick={() => { setActiveTab('rate_guide'); handleCloseForm(); }}
                                className={`px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'rate_guide'
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                RATE GUIDE
                            </button>
                        </div>
                    </div>

                    {activeTab === 'applications' ? (() => {
                        const filteredInvestments = allInvestments.filter(inv => {
                            const matchesSearch = !searchQuery ||
                                (inv.rep_full_name && inv.rep_full_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                (inv.customer_name && inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                (inv.id && inv.id.toString().includes(searchQuery));

                            const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
                            const matchesStage = stageFilter === 'all' || (inv.stage || 'submitted') === stageFilter;
                            const matchesEntity = entityFilter === 'all' || inv.entity_type === entityFilter;
                            let matchesOfficer = true;
                            if (officerFilter === 'unassigned') {
                                matchesOfficer = !inv.officer_name || inv.officer_name === 'Marketing Promotion';
                            } else if (officerFilter !== 'all') {
                                matchesOfficer = inv.officer_name === officerFilter;
                            }

                            return matchesSearch && matchesStatus && matchesStage && matchesEntity && matchesOfficer;
                        });

                        return (
                            <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center bg-slate-50 dark:bg-[#0f172a]/50 gap-4">
                                    <div>
                                        <h3 className="font-black text-lg text-slate-900 dark:text-white">All Investments</h3>
                                        <p className="text-slate-500 text-xs font-medium"> Total: {filteredInvestments.length} matching applications</p>
                                    </div>
                                    <div className="flex items-center gap-4 flex-wrap">
                                        <button
                                            onClick={() => setShowStaffApplicationFlow(true)}
                                            className="px-6 py-2 bg-purple-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-purple-700 transition-all flex items-center gap-2 shadow-lg shadow-purple-600/20"
                                        >
                                            <span className="material-symbols-outlined text-sm">add_circle</span>
                                            New Application
                                        </button>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                                            <input
                                                type="text"
                                                placeholder="Search name or ID..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="pl-10 pr-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold w-48 focus:outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <select
                                            value={stageFilter}
                                            onChange={(e) => setStageFilter(e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                        >
                                            <option value="all">All Stages</option>
                                            <option value="submitted">Submitted</option>
                                            <option value="compliance_review">Compliance</option>
                                            <option value="finance_review">Finance</option>
                                            <option value="active">Active</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                        <select
                                            value={statusFilter}
                                            onChange={(e) => setStatusFilter(e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                        >
                                            <option value="all">All Status</option>
                                            <option value="pending">Pending</option>
                                            <option value="active">Active</option>
                                            <option value="completed">Completed</option>
                                            <option value="rejected">Rejected</option>
                                            <option value="terminated">Terminated</option>
                                        </select>
                                        <select
                                            value={entityFilter}
                                            onChange={(e) => setEntityFilter(e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                        >
                                            <option value="all">All Entities</option>
                                            <option value="INDIVIDUAL">Individual</option>
                                            <option value="CORPORATE">Corporate</option>
                                        </select>
                                        <select
                                            value={officerFilter}
                                            onChange={(e) => setOfficerFilter(e.target.value)}
                                            className="px-4 py-2 bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 outline-none"
                                        >
                                            <option value="all">All Officers</option>
                                            <option value="unassigned">Unassigned / Promotion</option>
                                            {Array.from(new Set(allInvestments.map(i => i.officer_name).filter(Boolean))).map((name: string) => (
                                                <option key={name} value={name}>{name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50/50 dark:bg-[#0f172a]/30 text-[10px] uppercase text-slate-500 font-black tracking-widest">
                                            <tr className="border-b border-slate-100 dark:border-slate-800">
                                                <th className="p-4 w-4"></th>
                                                <th className="p-4 min-w-[120px]">Reference</th>
                                                <th className="p-4 min-w-[200px]">Applicant</th>
                                                <th className="p-4 min-w-[150px]">Investment Plan</th>
                                                <th className="p-4 min-w-[150px]">Officer</th>
                                                <th className="p-4 min-w-[150px]">Status</th>
                                                <th className="p-4 min-w-[120px]">Indemnity</th>
                                                <th className="p-4 min-w-[150px]">Stage</th>
                                                <th className="p-4 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredInvestments.length > 0 ? (
                                                filteredInvestments.map((inv) => (
                                                    <tr key={inv.id} className={`group hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-300 cursor-pointer ${inv.is_gift ? 'bg-rose-50/50 dark:bg-rose-900/10' : ''}`} onClick={() => navigate(`/staff/investments/${inv.id}`)}>
                                                        <td className="p-4">
                                                            <div className={`size-4 rounded border transition-colors ${inv.is_gift ? 'border-rose-300 bg-rose-200' : 'border-slate-300 dark:border-slate-700'}`}>
                                                                {inv.is_gift && <span className="material-symbols-outlined text-rose-600 text-[10px] font-black">favorite</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1">
                                                                <span className="font-mono text-slate-900 dark:text-white text-xs font-bold text-nowrap">
                                                                    INV-{inv.id}
                                                                </span>
                                                                <span className="text-[10px] font-bold text-slate-500 text-nowrap">
                                                                    {new Date(inv.created_at).toLocaleDateString()}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-8 rounded-full flex items-center justify-center text-xs font-black border shrink-0 ${inv.is_gift ? 'bg-rose-100 border-rose-200 text-rose-600' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white border-slate-300 dark:border-slate-700'
                                                                    }`}>
                                                                    {inv.company_name ? inv.company_name.charAt(0) : (inv.rep_full_name ? inv.rep_full_name.charAt(0) : '?')}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-black text-slate-900 dark:text-white text-xs leading-none">
                                                                            {inv.company_name || inv.rep_full_name || 'Anonymous'}
                                                                            {inv.entity_type === 'JOINT' && inv.partner_name ? ` & ${inv.partner_name}` : ''}
                                                                        </span>
                                                                        <span className={`px-1.5 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest leading-none ${inv.entity_type === 'CORPORATE' ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-500' : inv.entity_type === 'JOINT' ? 'border-sky-500/20 bg-sky-500/10 text-sky-500' : 'border-slate-400/20 bg-slate-400/10 text-slate-500 dark:text-slate-400'
                                                                            }`}>
                                                                            {inv.entity_type === 'CORPORATE' ? 'CORP' : inv.entity_type === 'JOINT' ? 'JOINT' : 'INDV'}
                                                                        </span>
                                                                        {inv.is_pending_partner && (
                                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500 text-white text-[8px] font-black uppercase tracking-tighter leading-none">
                                                                                <span className="material-symbols-outlined text-[8px]">hourglass_empty</span>
                                                                                PARTNER
                                                                            </span>
                                                                        )}
                                                                        {inv.is_minor_beneficiary && (
                                                                            <span className="px-1.5 py-0.5 rounded border border-teal-500/20 bg-teal-500/10 text-[8px] font-black uppercase tracking-widest leading-none text-teal-600 dark:text-teal-400">
                                                                                For Minor
                                                                            </span>
                                                                        )}
                                                                        {inv.is_liquidating && (
                                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-500 text-white text-[8px] font-black uppercase tracking-tighter leading-none">
                                                                                <span className="material-symbols-outlined text-[8px]">warning</span>
                                                                                LIQ
                                                                            </span>
                                                                        )}
                                                                        {inv.is_gift && (
                                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-rose-500 text-white text-[8px] font-black uppercase tracking-tighter leading-none">
                                                                                <span className="material-symbols-outlined text-[8px]">featured_seasonal</span>
                                                                                GIFT
                                                                            </span>
                                                                        )}
                                                                        {inv.original_investment_id && (
                                                                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-purple-600 text-white text-[8px] font-black uppercase tracking-tighter shadow-sm leading-none">
                                                                                <span className="material-symbols-outlined text-[8px]">add_circle</span>
                                                                                TOP-UP
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <span className="text-[10px] font-bold text-slate-500 mt-1">
                                                                        {inv.entity_type === 'CORPORATE' ? inv.rep_full_name : inv.customer_email}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="px-2 py-0.5 rounded border border-purple-500/20 bg-purple-500/10 text-[9px] font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider text-nowrap">
                                                                        {inv.investment_type?.replace(/_/g, ' ') || 'INVESTMENT'}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">{inv.interest_rate}% P.A</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                                    <span>{inv.currency === 'USD' ? '$' : '₦'}{Number(inv.investment_amount).toLocaleString()}</span>
                                                                    <span className="size-1 rounded-full bg-slate-300 dark:bg-slate-700"></span>
                                                                    <span>{inv.tenure_days} Days</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-slate-700 dark:text-slate-300 font-bold text-xs" onClick={(e) => e.stopPropagation()}>
                                                            {['sales_manager', 'admin', 'super_admin', 'superadmin', 'customer_experience'].includes(user.role || '') ? (
                                                                <div className="relative group/assign w-fit">
                                                                    <div className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                                                                        <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">person</span>
                                                                        <span className="text-xs font-bold">{inv.officer_name || 'Unassigned'}</span>
                                                                        <span className="material-symbols-outlined text-[10px] text-slate-400 ml-1 opacity-0 group-hover/assign:opacity-100">edit</span>
                                                                    </div>
                                                                    <select
                                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                                        value={inv.sales_officer_id || ''}
                                                                        onChange={(e) => handleAssignOfficer(inv.id, e.target.value)}
                                                                    >
                                                                        <option value="" disabled>Select Officer</option>
                                                                        {inv.sales_officer_id && <option value="unassign">❌ Unassign Officer</option>}
                                                                        {officers.map(officer => (
                                                                            <option key={officer.id} value={officer.id}>{officer.full_name}</option>
                                                                        ))}
                                                                    </select>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-2 text-slate-500 py-1.5">
                                                                    <span className="material-symbols-outlined text-sm font-bold opacity-70">person</span>
                                                                    <span className="text-xs font-bold">{inv.officer_name || 'Unassigned'}</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-2 w-fit">
                                                                <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-black border ${inv.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                                    inv.status === 'completed' ? 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                                                                        inv.status === 'rejected' || inv.status === 'terminated' ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                                            'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                                                    }`}>
                                                                    <span className={`size-1.5 rounded-full ${inv.status === 'active' ? 'bg-emerald-500' :
                                                                        inv.status === 'completed' ? 'bg-sky-500' :
                                                                            inv.status === 'rejected' || inv.status === 'terminated' ? 'bg-rose-500' :
                                                                                'bg-amber-500'
                                                                        }`}></span>
                                                                    {inv.status || 'pending'}
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {inv.indemnity_document_url ? (
                                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider w-fit border border-emerald-200 dark:border-emerald-800/50">
                                                                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                                    Signed
                                                                </span>
                                                            ) : (
                                                                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider w-fit border border-amber-200 dark:border-amber-800/50">
                                                                    <span className="size-1.5 rounded-full bg-amber-500"></span>
                                                                    Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-2 w-fit">
                                                                {/* <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded uppercase tracking-wider text-[9px] font-black border ${
                                                            inv.status === 'active' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                                                            inv.status === 'completed' ? 'border-sky-500/20 bg-sky-500/10 text-sky-600 dark:text-sky-400' :
                                                            inv.status === 'rejected' || inv.status === 'terminated' ? 'border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400' :
                                                            'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-500'
                                                        }`}>
                                                            <span className={`size-1.5 rounded-full ${
                                                                inv.status === 'active' ? 'bg-emerald-500' :
                                                                inv.status === 'completed' ? 'bg-sky-500' :
                                                                inv.status === 'rejected' || inv.status === 'terminated' ? 'bg-rose-500' :
                                                                'bg-amber-500'
                                                            }`}></span>
                                                            {inv.status || 'pending'}
                                                        </div> */}
                                                                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest truncate max-w-[120px]">
                                                                    {inv.stage?.replace(/_/g, ' ') || 'Submitted'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            {(inv.status === 'active' || inv.status === 'completed') && (user?.role?.toLowerCase() === 'finance' || user?.role?.toLowerCase() === 'superadmin' || user?.role?.toLowerCase() === 'super_admin') ? (
                                                                <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={() => setOpenDropdownId(openDropdownId === inv.id ? null : inv.id)}
                                                                        className={`p-2 rounded-xl transition-all ${openDropdownId === inv.id ? 'bg-purple-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-purple-600'}`}
                                                                    >
                                                                        <span className="material-symbols-outlined text-xl">more_vert</span>
                                                                    </button>

                                                                    {openDropdownId === inv.id && (
                                                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                                            <div className="px-4 py-2 mb-1 border-b border-slate-50 dark:border-slate-700/50">
                                                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Management</p>
                                                                            </div>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    handleTopUp(inv);
                                                                                }}
                                                                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all uppercase tracking-widest group"
                                                                            >
                                                                                <div className="size-7 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-white transition-colors text-emerald-500">
                                                                                    <span className="material-symbols-outlined text-base">add_circle</span>
                                                                                </div>
                                                                                Top-Up
                                                                            </button>
                                                                            <button
                                                                                onClick={() => {
                                                                                    setOpenDropdownId(null);
                                                                                    navigate(`/staff/investments/${inv.id}`);
                                                                                }}
                                                                                className="w-full flex items-center gap-3 px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-blue-500/10 hover:text-blue-500 transition-all uppercase tracking-widest group border-t border-slate-50 dark:border-slate-700/50"
                                                                            >
                                                                                <div className="size-7 rounded-lg bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-white transition-colors text-blue-500">
                                                                                    <span className="material-symbols-outlined text-base">visibility</span>
                                                                                </div>
                                                                                View Details
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); navigate(`/staff/investments/${inv.id}`); }}
                                                                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-600 transition-all"
                                                                >
                                                                    <span className="material-symbols-outlined text-xl">visibility</span>
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={9} className="px-8 py-20 text-center">
                                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                                            <span className="material-symbols-outlined text-4xl">inbox</span>
                                                            <p className="text-[10px] font-black uppercase tracking-[0.2em]">No investment applications found</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        );
                    })() : (
                        <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* Left Side: Rates Table */}
                            <div className="flex-1 bg-white dark:bg-[#1e293b]/50 rounded-[32px] border border-slate-200 dark:border-slate-800 overflow-hidden backdrop-blur-md">
                                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Rates</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage investment product yields</p>
                                    </div>
                                    <button
                                        onClick={() => setShowAddRateForm(true)}
                                        className="px-6 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black lg:flex items-center gap-3 hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20 active:scale-95 uppercase tracking-widest"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span>
                                        Add New Rate
                                    </button>
                                </div>

                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Plan</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Range (₦)</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Tenure</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Interest</th>
                                                <th className="px-8 py-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Payout Freq. (Vault)</th>
                                                <th className="px-8 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {rates.length > 0 ? (
                                                rates.map((rate) => (
                                                    <tr key={rate.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-8 py-6">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`size-2 rounded-full ${rate.plan_name === 'NOLT Rise' ? 'bg-blue-500' : rate.plan_name === 'NOLT Surge' ? 'bg-purple-500' : 'bg-orange-500'}`} />
                                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm">{rate.plan_name}</span>
                                                            </div>
                                                        </td>
                                                        <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300 text-sm">
                                                            {currencySymbols[rate.currency]}{Number(rate.min_amount).toLocaleString()} - {rate.max_amount ? `${currencySymbols[rate.currency]}${Number(rate.max_amount).toLocaleString()}` : '∞'}
                                                        </td>
                                                        <td className="px-8 py-6 font-bold text-slate-600 dark:text-slate-300 text-sm">
                                                            {rate.tenure_days} Days
                                                        </td>
                                                        <td className="px-8 py-6 text-center">
                                                            <span className="px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 text-green-500 text-[10px] font-black uppercase tracking-widest">
                                                                {rate.interest_rate}% P.A
                                                            </span>
                                                        </td>
                                                        <td className="px-8 py-6 text-center font-bold text-slate-600 dark:text-slate-300 text-sm uppercase">
                                                            {rate.plan_name === 'NOLT Vault' ? (rate.payout_frequency || rate.contribution_frequency || '-') : '-'}
                                                        </td>
                                                        <td className="px-8 py-6">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => handleDuplicateRate(rate)}
                                                                    className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">content_copy</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleEditRate(rate)}
                                                                    className="size-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-blue-500 transition-colors flex items-center justify-center"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteRate(rate.id)}
                                                                    className="size-8 rounded-lg bg-red-50 dark:bg-red-900/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center"
                                                                >
                                                                    <span className="material-symbols-outlined text-lg">delete</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                                        {loading ? 'Loading rates...' : 'No yield rates configured'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Right Side: Rate Management Info Card */}
                            <div className="w-full lg:w-80 space-y-6">
                                <div className="bg-slate-900 dark:bg-[#1e293b] rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
                                    <div className="absolute top-0 right-0 p-8 opacity-10">
                                        <span className="material-symbols-outlined text-8xl">trending_up</span>
                                    </div>
                                    <div className="relative z-10 flex flex-col items-center text-center space-y-6">
                                        <div className="size-16 rounded-[22px] bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                                            <span className="material-symbols-outlined text-3xl">info</span>
                                        </div>
                                        <div className="space-y-3">
                                            <h3 className="text-xl font-black uppercase tracking-tight text-white leading-none">Rate Management</h3>
                                            <p className="text-xs text-slate-400 font-medium leading-relaxed">
                                                Select a rate from the list to modify its parameters. Changes will be reflected immediately on the customer-facing portal.
                                            </p>
                                        </div>
                                        <div className="w-full pt-6 border-t border-slate-800 space-y-4 font-black uppercase tracking-widest text-[9px]">
                                            <div className="flex justify-between items-center text-slate-500">
                                                <span>Last Updated</span>
                                                <span className="text-white">TODAY, 10:42 AM</span>
                                            </div>
                                            <div className="flex justify-between items-center text-slate-500">
                                                <span>Active Plans</span>
                                                <span className="text-white">2 Products</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {showAddRateForm && (
                        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleCloseForm} />
                            <div className="relative w-full max-w-lg bg-white dark:bg-[#1e293b] rounded-[40px] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300 text-slate-900 dark:text-white">
                                <div className="p-10 space-y-10">
                                    <div className="flex justify-between items-center px-2">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tight">{editingId ? 'EDIT YIELD RATE' : 'ADD NEW RATE'}</h3>
                                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Configure investment parameters</p>
                                        </div>
                                        <button onClick={handleCloseForm} className="size-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center">
                                            <span className="material-symbols-outlined text-2xl">close</span>
                                        </button>
                                    </div>

                                    <form className="space-y-8" onSubmit={handleActivateYieldRate}>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Investment Plan</label>
                                                <select
                                                    value={formData.plan}
                                                    onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option>NOLT Rise</option>
                                                    <option>NOLT Surge</option>
                                                    <option>NOLT Vault</option>
                                                </select>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Currency</label>
                                                <select
                                                    value={formData.currency}
                                                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                                                    className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="NGN">NGN (₦)</option>
                                                    <option value="USD">USD ($)</option>
                                                    <option value="GBP">GBP (£)</option>
                                                    <option value="EUR">EUR (€)</option>
                                                </select>
                                            </div>
                                        </div>

                                        {formData.plan === 'NOLT Vault' && (
                                            <div className="grid grid-cols-1 gap-6">
                                                <div className="space-y-3">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Payout Frequency</label>
                                                    <select
                                                        value={formData.payoutFrequency}
                                                        onChange={(e) => setFormData({ ...formData, payoutFrequency: e.target.value })}
                                                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none cursor-pointer"
                                                    >
                                                        <option value="upfront">Upfront</option>
                                                        <option value="monthly">Monthly</option>
                                                        <option value="quarterly">Quarterly</option>
                                                        <option value="maturity">At Maturity</option>
                                                    </select>
                                                </div>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tenure (Days)</label>
                                                    <span className="text-xs font-black text-blue-500">{formData.tenure} Days</span>
                                                </div>
                                                <div className="relative pt-2">
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max={TENURE_VALUES.length - 1}
                                                        step="1"
                                                        value={TENURE_VALUES.indexOf(parseInt(formData.tenure)) !== -1 ? TENURE_VALUES.indexOf(parseInt(formData.tenure)) : 0}
                                                        onChange={(e) => {
                                                            const newTenure = TENURE_VALUES[parseInt(e.target.value)];
                                                            setFormData({ ...formData, tenure: newTenure.toString() });
                                                        }}
                                                        className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                                    />
                                                    <div className="flex justify-between mt-2 px-1">
                                                        <span className="text-[9px] font-bold text-slate-400">30D</span>
                                                        <span className="text-[9px] font-bold text-slate-400">180D</span>
                                                        <span className="text-[9px] font-bold text-slate-400">365D</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Annual Interest Rate (%)</label>
                                                <div className="relative">
                                                    <input
                                                        required
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="e.g. 14.5"
                                                        value={formData.interest}
                                                        onChange={(e) => setFormData({ ...formData, interest: e.target.value })}
                                                        className="w-full h-14 px-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                    <span className="absolute right-5 top-1/2 -translate-y-1/2 text-blue-500 font-black text-xs uppercase">% P.A</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Investment Range ({currencySymbols[formData.currency]})</label>
                                                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsInfinity(!isInfinity)}>
                                                    <div className={`size-4 rounded border transition-all flex items-center justify-center ${isInfinity ? 'bg-blue-600 border-blue-600' : 'border-slate-300 dark:border-slate-700'}`}>
                                                        {isInfinity && <span className="material-symbols-outlined text-white text-[10px] font-bold">check</span>}
                                                    </div>
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-500 transition-colors">Infinity</span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbols[formData.currency]}</span>
                                                    <input
                                                        required
                                                        type="number"
                                                        min="0"
                                                        placeholder="Min Amount"
                                                        value={formData.minAmount}
                                                        onChange={(e) => setFormData({ ...formData, minAmount: e.target.value })}
                                                        className="w-full h-14 pl-10 pr-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">{currencySymbols[formData.currency]}</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        placeholder={isInfinity ? "∞" : "Max Amount"}
                                                        disabled={isInfinity}
                                                        value={isInfinity ? '' : formData.maxAmount}
                                                        onChange={(e) => setFormData({ ...formData, maxAmount: e.target.value })}
                                                        className={`w-full h-14 pl-10 pr-5 rounded-2xl border-none outline-none font-bold text-sm focus:ring-2 focus:ring-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isInfinity ? 'bg-slate-100 dark:bg-slate-900/50 text-slate-400 cursor-not-allowed opacity-50' : 'bg-slate-50 dark:bg-slate-800'}`}
                                                    />
                                                </div>
                                            </div>
                                        </div>


                                        <div className="pt-6 flex gap-4">
                                            <button
                                                type="button"
                                                onClick={handleCloseForm}
                                                className="flex-1 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase tracking-widest text-[10px]"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                type="submit"
                                                className="flex-[2] h-14 rounded-2xl bg-blue-600 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-500 transition-all active:scale-95 text-xs"
                                            >
                                                {isSubmitting ? (editingId ? 'Updating...' : 'Creating...') : (editingId ? 'Update Rate' : 'Create New Rate')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </StaffLayout>
        </div>
    );
};

export default StaffInvestmentsPage;
