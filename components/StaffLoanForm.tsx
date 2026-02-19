import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MdaTertiarySelect, { TERTIARY_LIST } from './MdaTertiarySelect';

interface StaffLoanFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

const NIGERIAN_STATES = [
    "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River",
    "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe", "Imo", "Jigawa", "Kaduna",
    "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo",
    "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

// --- Helper Components ---

const InputGroup = ({ label, required = false, children, className = "", error }: any) => (
    <div className={`space-y-3 ${className}`}>
        <div className="flex justify-between items-end">
            <label className={`text-xs font-black uppercase tracking-widest leading-none ${error ? 'text-red-500' : 'text-slate-400'}`}>
                {label} {required && <span className="text-primary">*</span>}
            </label>
            {error && <span className="text-[10px] font-bold text-red-500 animate-in slide-in-from-left-2">{error}</span>}
        </div>
        {children}
    </div>
);

const FileUpload = ({
    id,
    label,
    required = false,
    doc,
    progress,
    error,
    onSelect,
    onRemove
}: {
    id: string,
    label: string,
    required?: boolean,
    doc: any,
    progress: number | undefined,
    error?: string,
    onSelect: (id: string) => void,
    onRemove: (id: string, e: React.MouseEvent) => void
}) => {
    return (
        <div className="space-y-3">
            <div className="flex justify-between items-end">
                <label className={`text-xs font-black uppercase tracking-widest leading-none ${error ? 'text-red-500' : 'text-slate-400'}`}>
                    {label} {required && <span className="text-primary">*</span>}
                </label>
                {error && <span className="text-[10px] font-bold text-red-500 animate-in slide-in-from-left-2">{error}</span>}
            </div>
            <div
                onClick={() => !doc && onSelect(id)}
                className={`relative w-full h-40 rounded-3xl border-2 border-dashed transition-all duration-300 group cursor-pointer overflow-hidden
                    ${error ? 'border-red-300 bg-red-50' :
                        doc
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }
                `}
            >
                {progress && !doc ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm z-10">
                        <div className="size-10 rounded-full border-4 border-slate-200 border-t-primary animate-spin" />
                        <span className="text-xs font-black text-primary uppercase tracking-wider">{progress}% Uploading</span>
                    </div>
                ) : null}

                {doc ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 animate-in zoom-in-95 duration-300">
                        <div className="size-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 flex items-center justify-center text-primary transform group-hover:scale-110 transition-transform duration-500">
                            <span className="material-symbols-outlined text-3xl">check_circle</span>
                        </div>
                        <div className="text-center w-full">
                            <p className="font-bold text-slate-900 dark:text-white truncate text-sm px-4">{doc.name}</p>
                            <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider mt-1">{doc.size}</p>
                        </div>
                        <button
                            onClick={(e) => onRemove(id, e)}
                            className="absolute top-3 right-3 size-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-lg">close</span>
                        </button>
                    </div>
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-400 group-hover:text-primary transition-colors duration-300">
                        <div className={`size-16 rounded-2xl bg-slate-50 dark:bg-slate-800 border-2 flex items-center justify-center group-hover:scale-110 transition-all duration-500 ${error ? 'border-red-200 bg-red-50' : 'border-slate-100 dark:border-slate-700 group-hover:border-primary/20 group-hover:bg-white dark:group-hover:bg-slate-700'}`}>
                            <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                        </div>
                        <div className="text-center">
                            <span className="text-xs font-black uppercase tracking-widest block">Click to Upload</span>
                            <span className="text-[10px] font-medium opacity-60">PDF, JPG, PNG up to 5MB</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Component ---

const StaffLoanForm: React.FC<StaffLoanFormProps> = ({ onClose, onSuccess, initialData, loanId, user }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [draftId] = useState(() => `L-DRAFT-${Date.now()}`); // Generate Draft ID for uploads
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Identity
    const [title, setTitle] = useState('Mr');
    const [surname, setSurname] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [gender, setGender] = useState('');
    const [dob, setDob] = useState('');
    const [religion, setReligion] = useState('');
    const [maritalStatus, setMaritalStatus] = useState('');
    const [mothersMaidenName, setMothersMaidenName] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [email, setEmail] = useState('');
    const [bvn, setBvn] = useState('');
    const [nin, setNin] = useState('');

    // Address
    const [stateOfOrigin, setStateOfOrigin] = useState('');
    const [stateOfResidence, setStateOfResidence] = useState('');
    const [residentialStatus, setResidentialStatus] = useState('');
    const [address, setAddress] = useState('');

    // Employment
    const [mda, setMda] = useState('');
    const [ippisNumber, setIppisNumber] = useState('');
    const [staffId, setStaffId] = useState('');
    const [monthlyIncome, setMonthlyIncome] = useState('');

    // Loan Request
    const [loanType, setLoanType] = useState('new');
    const [amount, setAmount] = useState('');
    const [tenure, setTenure] = useState(6);

    // Bank Details
    const [bankName, setBankName] = useState('');
    const [accountNumber, setAccountNumber] = useState('');
    const [accountName, setAccountName] = useState('');
    const [bankList, setBankList] = useState<{ name: string, code: string }[]>([]);
    const [productType, setProductType] = useState('');

    // New Fields for TopUp/BuyOver
    const [casa, setCasa] = useState('');
    const [topUpAmount, setTopUpAmount] = useState('');
    const [buyOverAmount, setBuyOverAmount] = useState('');
    const [buyOverCompanyName, setBuyOverCompanyName] = useState('');
    const [buyOverAccountName, setBuyOverAccountName] = useState('');
    const [buyOverAccountNumber, setBuyOverAccountNumber] = useState('');

    // Documents
    const [uploadedDocs, setUploadedDocs] = useState<Record<string, { name: string, size: string, url: string } | null>>({
        govt_id: null,
        work_id: null,
        payslip: null,
        selfie: null,
        bank_statement: null,
        proof_address: null
    });

    // References
    const [references, setReferences] = useState([
        { fullName: '', phoneNumber: '', relationship: '', address: '' }
    ]);

    const steps = [
        "Identity",
        "Address",
        "Employment",
        "Loan Details",
        "Documents",
        "References"
    ];

    // Populate form if initialData exists (Edit Mode)
    useEffect(() => {
        if (initialData) {
            setProductType(initialData.product_type || '');
            setTitle(initialData.title || 'Mr');
            setSurname(initialData.surname || '');
            setFirstName(initialData.first_name || '');
            setMiddleName(initialData.middle_name || '');
            setGender(initialData.gender || '');
            setDob(initialData.date_of_birth ? new Date(initialData.date_of_birth).toISOString().split('T')[0] : '');
            setReligion(initialData.religion || '');
            setMaritalStatus(initialData.marital_status || '');
            setMothersMaidenName(initialData.mothers_maiden_name || '');
            setMobileNumber(initialData.mobile_number || '');
            setEmail(initialData.personal_email || '');
            setBvn(initialData.bvn || '');
            setNin(initialData.nin || '');

            setStateOfOrigin(initialData.state_of_origin || '');
            setStateOfResidence(initialData.state_of_residence || '');
            setResidentialStatus(initialData.residential_status || '');
            setAddress(initialData.primary_home_address || '');

            setMda(initialData.mda_tertiary || '');
            setIppisNumber(initialData.ippis_number || '');
            setStaffId(initialData.staff_id || '');
            setMonthlyIncome(initialData.average_monthly_income || '');

            setAmount(initialData.requested_loan_amount || '');
            setTenure(initialData.loan_tenure_months || 6);
            setLoanType(initialData.loan_type || 'new');

            // Populate New Fields
            setCasa(String(initialData.casa).split('.')[0] || '');
            setTopUpAmount(initialData.topup_amount || '');
            setBuyOverAmount(initialData.buy_over_amount || '');
            setBuyOverCompanyName(initialData.buy_over_company_name || '');
            setBuyOverAccountName(initialData.buy_over_company_account_name || '');
            setBuyOverAccountNumber(initialData.buy_over_company_account_number || '');

            // Pre-fill documents references if URLs exist (visual only, real re-upload needed to change)
            setUploadedDocs(prev => ({
                ...prev,
                govt_id: initialData.govt_id_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.govt_id_url } : null,
                work_id: initialData.work_id_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.work_id_url } : null,
                payslip: initialData.payslip_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.payslip_url } : null,
                selfie: initialData.selfie_verification_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.selfie_verification_url } : null,
                bank_statement: initialData.statement_of_account_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.statement_of_account_url } : null,
                proof_address: initialData.proof_of_residence_url ? { name: 'Existing Document', size: 'Unknown', url: initialData.proof_of_residence_url } : null,
            }));

            if (initialData.customer_references) {
                // Ensure references array matches structure or fallback
                const refs = Array.isArray(initialData.customer_references) ? initialData.customer_references : [];
                if (refs.length > 0) setReferences(refs);
            }

            // Bank Details
            setBankName(initialData.bank_name || '');
            setAccountNumber(initialData.account_number || '');
            setAccountName(initialData.account_name || '');
        }
    }, [initialData]);

    useEffect(() => {
        // Fetch banks
        const fetchBanks = async () => {
            try {
                // Use relative path to leverage proxy (Vite)
                const response = await axios.get('/api/misc/banks');
                if (response.data && response.data.data) {
                    setBankList(response.data.data);
                } else {
                    console.warn("Bank list response format unexpected:", response.data);
                }
            } catch (error) {
                console.error("Error fetching banks:", error);
            }
        };
        fetchBanks();
    }, []);

    const updateReference = (index: number, field: string, value: string) => {
        const newRefs = [...references];
        // @ts-ignore
        newRefs[index][field] = value;
        setReferences(newRefs);

        // Clear error if exists
        if (errors[`ref_${index}_${field}`]) {
            setErrors(prev => { const n = { ...prev }; delete n[`ref_${index}_${field}`]; return n; });
        }
    };

    const addReference = () => {
        setReferences([...references, { fullName: '', phoneNumber: '', relationship: '', address: '' }]);
    };

    const removeReference = (index: number) => {
        if (references.length > 1) {
            setReferences(references.filter((_, i) => i !== index));
            // Cleanup errors for removed index might be complex, simplified for now
        }
    };

    // Helper for numeric inputs
    const handleNumericChange = (setter: (val: string) => void, field: string, maxLength?: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, ''); // Strip non-numeric
        if (maxLength && val.length > maxLength) return;
        setter(val);
        if (errors[field]) clearError(field);
    };

    const clearError = (field: string) => {
        setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
    };

    // File Upload Logic
    const uploadFile = async (id: string, file: File) => {
        setUploadProgress(prev => ({ ...prev, [id]: 10 }));
        const formData = new FormData();
        formData.append('file', file);
        formData.append('document_type', id);
        formData.append('loan_id', draftId); // Pass draft ID

        try {
            setUploadProgress(prev => ({ ...prev, [id]: 30 }));
            const response = await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
                    setUploadProgress(prev => ({ ...prev, [id]: percentCompleted }));
                }
            });

            setUploadedDocs(prev => ({
                ...prev,
                [id]: {
                    name: file.name,
                    size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                    url: response.data.document.file_url
                }
            }));

            if (errors[id]) clearError(id);

        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed. Please try again.");
            setUploadProgress(prev => { const next = { ...prev }; delete next[id]; return next; });
        }
    };

    const handleFileSelect = (id: string) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*,application/pdf';
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) uploadFile(id, file);
        };
        input.click();
    };

    const removeDoc = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setUploadedDocs(prev => ({ ...prev, [id]: null }));
        setUploadProgress(prev => { const next = { ...prev }; delete next[id]; return next; });
    };

    const validateStep = () => {
        const newErrors: Record<string, string> = {};
        let isValid = true;

        // Check for Simplified Mode (Buy Over removed)
        if (['topup', 're-app', 'add_on'].includes(loanType)) {
            // Simplified Validation
            if (!surname.trim()) newErrors.surname = "Required";
            if (!firstName.trim()) newErrors.firstName = "Required";

            if (!mobileNumber) newErrors.mobileNumber = "Required";
            else if (mobileNumber.length < 10) newErrors.mobileNumber = "Invalid Number";

            if (!ippisNumber) newErrors.ippisNumber = "Required";
            if (!casa) newErrors.casa = "Required";

            if (loanType === 'topup' || loanType === 'add_on') {
                if (!topUpAmount) newErrors.topUpAmount = "Required";
            }

            if (loanType === 'topup' || loanType === 'add_on') {
                if (!topUpAmount) newErrors.topUpAmount = "Required";
            }

            // New Validation for Tenure & Bank Details
            if (!bankName) newErrors.bankName = "Required";
            if (!accountNumber) {
                newErrors.accountNumber = "Required";
            } else if (!/^\d{10}$/.test(accountNumber)) {
                newErrors.accountNumber = "Must be 10 digits";
            }
            if (!accountName) newErrors.accountName = "Required";

            if (!uploadedDocs.payslip) newErrors.payslip = "Required";

        } else {
            // Standard Wizard Validation
            if (step === 0) { // Identity
                if (!surname.trim()) newErrors.surname = "Required";
                if (!firstName.trim()) newErrors.firstName = "Required";
                if (!gender) newErrors.gender = "Required";
                if (!dob) newErrors.dob = "Required";
                if (!maritalStatus) newErrors.maritalStatus = "Required";

                if (!mobileNumber) newErrors.mobileNumber = "Required";
                else if (mobileNumber.length < 10) newErrors.mobileNumber = "Invalid Number";

                if (!bvn) newErrors.bvn = "Required";
                else if (bvn.length !== 11) newErrors.bvn = "Must be 11 digits";

                if (!nin) newErrors.nin = "Required";
                else if (nin.length !== 11) newErrors.nin = "Must be 11 digits";

                // Age validation (18+)
                if (dob) {
                    const age = new Date().getFullYear() - new Date(dob).getFullYear();
                    if (age < 18) newErrors.dob = "Must be 18+";
                }
            }

            if (step === 1) { // Address
                if (!stateOfOrigin) newErrors.stateOfOrigin = "Required";
                if (!stateOfResidence) newErrors.stateOfResidence = "Required";
                if (!residentialStatus) newErrors.residentialStatus = "Required";
                if (!address.trim()) newErrors.address = "Required";
            }

            if (step === 2) { // Employment
                if (!mda) newErrors.mda = "Required";

                const isTertiary = TERTIARY_LIST.includes(mda);
                if (!isTertiary && !ippisNumber) newErrors.ippisNumber = "Required";
                if (isTertiary && !staffId) newErrors.staffId = "Required";

                if (!monthlyIncome) newErrors.monthlyIncome = "Required";
            }

            if (step === 3) { // Loan
                if (!amount) newErrors.amount = "Required";
                else if (parseFloat(amount) < 100000) newErrors.amount = "Minimum ₦100,000";

                if (!bankName) newErrors.bankName = "Required";
                if (!accountNumber) {
                    newErrors.accountNumber = "Required";
                } else if (!/^\d{10}$/.test(accountNumber)) {
                    newErrors.accountNumber = "Must be 10 digits";
                }
                if (!accountName) newErrors.accountName = "Required";

                if (loanType === 'buy_over') {
                    if (!buyOverAmount) newErrors.buyOverAmount = "Required";
                    if (!buyOverCompanyName) newErrors.buyOverCompanyName = "Required";
                    if (!buyOverAccountName) newErrors.buyOverAccountName = "Required";
                    if (!buyOverAccountNumber) newErrors.buyOverAccountNumber = "Required";
                }
            }

            if (step === 4) { // Documents
                if (!uploadedDocs.govt_id) newErrors.govt_id = "Required";
                if (!uploadedDocs.work_id) newErrors.work_id = "Required";
                if (!uploadedDocs.payslip) newErrors.payslip = "Required";

                // Bank Statement required for > 500k
                if ((parseFloat(amount) || 0) > 500000 && !uploadedDocs.bank_statement) {
                    newErrors.bank_statement = "Required for > ₦500k";
                }
            }

            if (step === 5) { // References
                references.forEach((ref, idx) => {
                    // All fields required for any added reference
                    if (!ref.fullName?.trim()) newErrors[`ref_${idx}_fullName`] = "Required";

                    if (!ref.phoneNumber?.trim()) {
                        newErrors[`ref_${idx}_phoneNumber`] = "Required";
                    } else if (ref.phoneNumber.replace(/\D/g, '').length < 10) {
                        newErrors[`ref_${idx}_phoneNumber`] = "Invalid Number";
                    }

                    if (!ref.relationship) newErrors[`ref_${idx}_relationship`] = "Required";
                    if (!ref.address?.trim()) newErrors[`ref_${idx}_address`] = "Required";
                });
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
    };

    const handleNext = () => {
        if (validateStep()) {
            setStep(prev => Math.min(prev + 1, steps.length - 1));
            setErrors({}); // Clear errors strictly on successful next
        } else {
            // alert("Please correct the errors before proceeding."); // Optional: remove alert if using inline errors
        }
    };

    const handleBack = () => {
        setStep(prev => Math.max(prev - 1, 0));
        setErrors({});
    };

    const handleSubmit = async () => {
        if (!validateStep()) return; // Validate final step

        setLoading(true);
        try {
            let payload: any = {
                loan_type: loanType,
                // Common Identity
                surname,
                first_name: firstName,
                middle_name: middleName,
                mobile_number: mobileNumber,
                ippis_number: ippisNumber,
                casa: casa, // Send as string ID
                payslip_url: uploadedDocs.payslip?.url,
            };

            if (['topup', 're-app', 'add_on'].includes(loanType)) {
                // --- SPECIAL LOAN PAYLOAD ---
                if (loanType === 'topup' || loanType === 'add_on' || loanType === 're-app') {
                    payload.topup_amount = parseFloat(topUpAmount) || 0;
                }

                // Include Tenure & Bank Details
                payload.loan_tenure_months = tenure;
                payload.bank_name = bankName;
                payload.account_number = accountNumber;
                payload.account_name = accountName;

            } else {
                // --- STANDARD WIZARD PAYLOAD ---
                payload = {
                    ...payload,
                    title,
                    productType,
                    gender,
                    date_of_birth: dob,
                    religion,
                    marital_status: maritalStatus,
                    mothers_maiden_name: mothersMaidenName,
                    personal_email: email,
                    bvn,
                    nin,
                    state_of_origin: stateOfOrigin,
                    state_of_residence: stateOfResidence,
                    residential_status: residentialStatus,
                    primary_home_address: address,
                    mda_tertiary: mda,
                    staff_id: staffId,
                    average_monthly_income: parseFloat(monthlyIncome) || 0,
                    requested_loan_amount: parseFloat(amount) || 0,
                    loan_tenure_months: tenure,

                    govt_id_url: uploadedDocs.govt_id?.url,
                    work_id_url: uploadedDocs.work_id?.url,
                    statement_of_account_url: uploadedDocs.bank_statement?.url,
                    proof_of_residence_url: uploadedDocs.proof_address?.url,
                    selfie_verification_url: uploadedDocs.selfie?.url,
                    references,

                    bank_name: bankName,
                    account_number: accountNumber,
                    account_name: accountName,

                    // Buy Over Specifics
                    buy_over_amount: loanType === 'buy_over' ? (parseFloat(buyOverAmount) || 0) : 0,
                    buy_over_company_name: loanType === 'buy_over' ? buyOverCompanyName : null,
                    buy_over_company_account_name: loanType === 'buy_over' ? buyOverAccountName : null,
                    buy_over_company_account_number: loanType === 'buy_over' ? buyOverAccountNumber : null,
                };
            }

            if (loanId) {
                // UPDATE Mode
                await axios.put(`/api/staff/loans/${loanId}`, payload);
                alert("Loan Application Updated Successfully!");
            } else {
                // CREATE Mode
                await axios.post('/api/staff/loans/application', payload);
                alert("Loan Application Created Successfully!");
            }

            onSuccess();
            onClose(); // Ensure we close the modal
        } catch (error: any) {
            console.error("Failed to save loan", error);
            alert(error.response?.data?.message || "Failed to save loan");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 overflow-y-auto">
            <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-[2.5rem] shadow-2xl shadow-black/50 flex flex-col max-h-[92vh] overflow-hidden border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-900 z-10">
                    <div className="space-y-1">
                        <p className="text-xs font-black text-primary uppercase tracking-widest">New Application</p>
                        {/* <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Staff Loan</h2> */}
                    </div>
                    <button
                        onClick={onClose}
                        className="size-10 rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-all duration-300 group"
                    >
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">close</span>
                    </button>
                </div>

                {/* Progress Indicator */}
                {/* Progress Indicator - Only for Wizard Mode */}
                {!['topup', 're-app', 'add_on'].includes(loanType) && (
                    <div className="px-6 md:px-8 pt-6 pb-2">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{steps[step]}</span>
                            <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Step {step + 1} / {steps.length}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(2,143,245,0.5)]"
                                style={{ width: `${((step + 1) / steps.length) * 100}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                    {/* --- SIMPLIFIED VIEW FOR SPECIAL LOANS --- */}
                    {['topup', 're-app', 'add_on'].includes(loanType) ? (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                            {/* Loan Type Selector */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                    <InputGroup label="Loan Type">
                                        <select className="input-field" value={loanType} onChange={e => {
                                            setLoanType(e.target.value);
                                            // Reset step to 0 if switching back to 'new' (wizard mode)
                                            if (e.target.value === 'new') setStep(0);
                                        }}>
                                            <option value="new">New Loan</option>
                                            <option value="topup">Top-up</option>
                                            <option value="buy_over">Buy-over</option>
                                            <option value="re-app">Re-app</option>
                                            <option value="add_on">Add-on</option>
                                        </select>
                                    </InputGroup>
                                </div>
                                <div className="p-4 bg-blue-50 text-blue-800 rounded-xl text-sm font-medium">
                                    <span className="font-bold">Note:</span> You are creating a {loanType.replace('_', ' ').toUpperCase()} loan. Only key fields are required.
                                </div>
                            </div>

                            {/* Identity Section */}
                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                <div className="md:col-span-4">
                                    <InputGroup label="Surname" required error={errors.surname}>
                                        <input className="input-field" value={surname} onChange={e => { setSurname(e.target.value); clearError('surname'); }} placeholder="e.g. Doe" />
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-4">
                                    <InputGroup label="First Name" required error={errors.firstName}>
                                        <input className="input-field" value={firstName} onChange={e => { setFirstName(e.target.value); clearError('firstName'); }} placeholder="e.g. John" />
                                    </InputGroup>
                                </div>
                                <div className="md:col-span-4">
                                    <InputGroup label="Middle Name">
                                        <input className="input-field" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" />
                                    </InputGroup>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <InputGroup label="Mobile Number" required error={errors.mobileNumber}>
                                    <input className="input-field" value={mobileNumber} onChange={handleNumericChange(setMobileNumber, 'mobileNumber', 11)} placeholder="080..." maxLength={11} />
                                </InputGroup>
                                <InputGroup label="IPPIS Number" required error={errors.ippisNumber}>
                                    <input className="input-field" value={ippisNumber} onChange={e => { setIppisNumber(e.target.value); clearError('ippisNumber'); }} />
                                </InputGroup>
                            </div>

                            {/* Financials / Specifics */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Financial Details</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <InputGroup label="CASA" error={errors.casa}>
                                        <input className="input-field" value={casa} onChange={e => { setCasa(e.target.value); clearError('casa'); }} placeholder="Enter CASA" />
                                    </InputGroup>

                                    {(loanType === 'topup' || loanType === 'add_on' || loanType === 're-app') && (
                                        <InputGroup label="Top Up Amount (₦)" required error={errors.topUpAmount}>
                                            <input type="number" className="input-field" value={topUpAmount} onChange={e => { setTopUpAmount(e.target.value); clearError('topUpAmount'); }} />
                                        </InputGroup>
                                    )}

                                    {/* Tenure & Bank Details for Special Loans */}
                                    {(['topup', 're-app', 'add_on'].includes(loanType)) && (
                                        <>
                                            <InputGroup label="Tenure (Months)" required>
                                                <select className="input-field" value={tenure} onChange={e => setTenure(Number(e.target.value))}>
                                                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                                        <option key={m} value={m}>{m} Months</option>
                                                    ))}
                                                </select>
                                            </InputGroup>

                                            <InputGroup label="Bank Name" required error={errors.bankName}>
                                                <select className="input-field" value={bankName} onChange={e => { setBankName(e.target.value); clearError('bankName'); }}>
                                                    <option value="">Select Bank</option>
                                                    {bankList.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                                </select>
                                            </InputGroup>

                                            <InputGroup label="Account Number" required error={errors.accountNumber}>
                                                <input className="input-field" value={accountNumber} onChange={handleNumericChange(setAccountNumber, 'accountNumber', 10)} maxLength={10} />
                                            </InputGroup>

                                            <InputGroup label="Account Name" required error={errors.accountName}>
                                                <input className="input-field" value={accountName} onChange={e => { setAccountName(e.target.value); clearError('accountName'); }} />
                                            </InputGroup>
                                        </>
                                    )}

                                    {loanType === 'buy_over' && (
                                        <>
                                            <InputGroup label="Buy Over Amount (₦)" required error={errors.buyOverAmount}>
                                                <input type="number" className="input-field" value={buyOverAmount} onChange={e => { setBuyOverAmount(e.target.value); clearError('buyOverAmount'); }} />
                                            </InputGroup>
                                            <InputGroup label="Buy Over Company Name" required error={errors.buyOverCompanyName}>
                                                <input className="input-field" value={buyOverCompanyName} onChange={e => { setBuyOverCompanyName(e.target.value); clearError('buyOverCompanyName'); }} />
                                            </InputGroup>
                                            <InputGroup label="Company Account Name" required error={errors.buyOverAccountName}>
                                                <input className="input-field" value={buyOverAccountName} onChange={e => { setBuyOverAccountName(e.target.value); clearError('buyOverAccountName'); }} />
                                            </InputGroup>
                                            <InputGroup label="Company Account Number" required error={errors.buyOverAccountNumber}>
                                                <input className="input-field" value={buyOverAccountNumber} onChange={handleNumericChange(setBuyOverAccountNumber, 'buyOverAccountNumber')} />
                                            </InputGroup>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Documents (Payslip Only) */}
                            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 border-b border-slate-200 pb-2">Documents</h4>
                                <FileUpload
                                    id="payslip"
                                    label="Recent Payslip"
                                    required
                                    doc={uploadedDocs.payslip}
                                    progress={uploadProgress.payslip}
                                    error={errors.payslip}
                                    onSelect={handleFileSelect}
                                    onRemove={removeDoc}
                                />
                            </div>

                        </div>
                    ) : (
                        // --- STANDARD WIZARD VIEW ---
                        <>
                            {step === 0 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    {/* Loan Type Section - Moved to Top */}
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 mb-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                                            <InputGroup label="Loan Type">
                                                <select className="input-field" value={loanType} onChange={e => setLoanType(e.target.value)}>
                                                    <option value="new">New Loan</option>
                                                    <option value="topup">Top-up</option>
                                                    <option value="buy_over">Buy-over</option>
                                                    <option value="re-app">Re-app</option>
                                                    <option value="add_on">Add-on</option>
                                                </select>
                                            </InputGroup>
                                        </div>
                                        {/* Conditional fields REMOVED from Wizard Step 0 as they are now in Special View */}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                        <div className="md:col-span-2">
                                            <InputGroup label="Product Type">
                                                <select className="input-field" value={productType} onChange={e => setProductType(e.target.value)}>
                                                    <option>Public Sector Loan</option>
                                                </select>
                                            </InputGroup>
                                        </div>
                                        <div className="md:col-span-2">
                                            <InputGroup label="Title">
                                                <select className="input-field" value={title} onChange={e => setTitle(e.target.value)}>
                                                    <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
                                                </select>
                                            </InputGroup>
                                        </div>
                                        <div className="md:col-span-4">
                                            <InputGroup label="Surname" required error={errors.surname}>
                                                <input className="input-field" value={surname} onChange={e => { setSurname(e.target.value); clearError('surname'); }} placeholder="e.g. Doe" />
                                            </InputGroup>
                                        </div>
                                        <div className="md:col-span-3">
                                            <InputGroup label="First Name" required error={errors.firstName}>
                                                <input className="input-field" value={firstName} onChange={e => { setFirstName(e.target.value); clearError('firstName'); }} placeholder="e.g. John" />
                                            </InputGroup>
                                        </div>
                                        <div className="md:col-span-3">
                                            <InputGroup label="Middle Name">
                                                <input className="input-field" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" />
                                            </InputGroup>
                                        </div>
                                    </div>

                                    <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <InputGroup label="Gender" required error={errors.gender}>
                                            <select className="input-field" value={gender} onChange={e => { setGender(e.target.value); clearError('gender'); }}>
                                                <option value="">Select</option><option>Male</option><option>Female</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Date of Birth" required error={errors.dob}>
                                            <input type="date" className="input-field" value={dob} onChange={e => { setDob(e.target.value); clearError('dob'); }} />
                                        </InputGroup>
                                        <InputGroup label="Marital Status" required error={errors.maritalStatus}>
                                            <select className="input-field" value={maritalStatus} onChange={e => { setMaritalStatus(e.target.value); clearError('maritalStatus'); }}>
                                                <option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option>
                                            </select>
                                        </InputGroup>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputGroup label="Mobile Number" required error={errors.mobileNumber}>
                                            <input className="input-field" value={mobileNumber} onChange={handleNumericChange(setMobileNumber, 'mobileNumber', 11)} placeholder="080..." maxLength={11} />
                                        </InputGroup>
                                        <InputGroup label="Email Address">
                                            <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="Optional" />
                                        </InputGroup>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <InputGroup label="BVN" required error={errors.bvn}>
                                            <input className="input-field" value={bvn} onChange={handleNumericChange(setBvn, 'bvn', 11)} maxLength={11} placeholder="11 Digits" />
                                        </InputGroup>
                                        <InputGroup label="NIN" required error={errors.nin}>
                                            <input className="input-field" value={nin} onChange={handleNumericChange(setNin, 'nin', 11)} maxLength={11} placeholder="11 Digits" />
                                        </InputGroup>
                                        <InputGroup label="Mother's Maiden Name">
                                            <input className="input-field" value={mothersMaidenName} onChange={e => setMothersMaidenName(e.target.value)} />
                                        </InputGroup>
                                    </div>
                                </div>
                            )}

                            {step === 1 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputGroup label="State of Origin" required error={errors.stateOfOrigin}>
                                            <select className="input-field" value={stateOfOrigin} onChange={e => { setStateOfOrigin(e.target.value); clearError('stateOfOrigin'); }}>
                                                <option value="">Select State</option>
                                                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="State of Residence" required error={errors.stateOfResidence}>
                                            <select className="input-field" value={stateOfResidence} onChange={e => { setStateOfResidence(e.target.value); clearError('stateOfResidence'); }}>
                                                <option value="">Select State</option>
                                                {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </InputGroup>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <InputGroup label="Residential Status" required error={errors.residentialStatus}>
                                            <select className="input-field" value={residentialStatus} onChange={e => { setResidentialStatus(e.target.value); clearError('residentialStatus'); }}>
                                                <option value="">Select</option><option>Rent</option><option>Owned</option>
                                            </select>
                                        </InputGroup>
                                        <InputGroup label="Home Address" required error={errors.address}>
                                            <input className="input-field" value={address} onChange={e => { setAddress(e.target.value); clearError('address'); }} />
                                        </InputGroup>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <MdaTertiarySelect
                                                label="MDA / Tertiary Institution *"
                                                value={mda}
                                                onChange={(val: string) => { setMda(val); clearError('mda'); }}
                                                error={errors.mda}
                                            />
                                        </div>
                                        <InputGroup label={`IPPIS Number ${TERTIARY_LIST.includes(mda) ? '(Optional)' : '*'}`} required={!TERTIARY_LIST.includes(mda)} error={errors.ippisNumber}>
                                            <input className="input-field" value={ippisNumber} onChange={e => { setIppisNumber(e.target.value); clearError('ippisNumber'); }} />
                                        </InputGroup>
                                        <InputGroup label={`Staff ID ${TERTIARY_LIST.includes(mda) ? '*' : '(Optional)'}`} required={TERTIARY_LIST.includes(mda)} error={errors.staffId}>
                                            <input className="input-field" value={staffId} onChange={e => { setStaffId(e.target.value); clearError('staffId'); }} />
                                        </InputGroup>
                                        <InputGroup label="Monthly Income" required error={errors.monthlyIncome}>
                                            <input type="number" className="input-field" value={monthlyIncome} onChange={e => { setMonthlyIncome(e.target.value); clearError('monthlyIncome'); }} />
                                        </InputGroup>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InputGroup label="Loan Amount" required error={errors.amount}>
                                                <div className="relative">
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                                                    <input type="number" className="input-field pl-8" value={amount} onChange={e => { setAmount(e.target.value); clearError('amount'); }} />
                                                </div>
                                            </InputGroup>
                                            <InputGroup label="Tenure (Months)">
                                                <select className="input-field" value={tenure} onChange={e => setTenure(parseInt(e.target.value))}>
                                                    {Array.from({ length: 16 }, (_, i) => i + 3).map(m => (
                                                        <option key={m} value={m}>{m} Months</option>
                                                    ))}
                                                </select>
                                            </InputGroup>
                                        </div>

                                        <div className="h-px bg-slate-100 dark:bg-slate-800 w-full" />

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InputGroup label="Bank Name" required error={errors.bankName}>
                                                <select className="input-field" value={bankName} onChange={e => { setBankName(e.target.value); clearError('bankName'); }}>
                                                    <option value="">Select Bank</option>
                                                    {bankList.map((bank: any) => (
                                                        <option key={bank.id} value={bank.name}>{bank.name}</option>
                                                    ))}
                                                </select>
                                            </InputGroup>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                            <InputGroup label="Account Number" required error={errors.accountNumber}>
                                                <input
                                                    className="input-field"
                                                    value={accountNumber}
                                                    onChange={handleNumericChange(setAccountNumber, 'accountNumber', 10)}
                                                    maxLength={10}
                                                    placeholder="10 Digits"
                                                />
                                            </InputGroup>
                                            <InputGroup label="Account Name" required error={errors.accountName}>
                                                <input
                                                    className="input-field"
                                                    value={accountName}
                                                    onChange={e => { setAccountName(e.target.value); clearError('accountName'); }}
                                                    placeholder="Account Name"
                                                />
                                            </InputGroup>
                                        </div>

                                        {loanType === 'buy_over' && (
                                            <div className="mt-8 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                                                <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-6">Buy Over Details</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <InputGroup label="Buy Over Amount (₦)" required error={errors.buyOverAmount}>
                                                        <input type="number" className="input-field" value={buyOverAmount} onChange={e => { setBuyOverAmount(e.target.value); clearError('buyOverAmount'); }} />
                                                    </InputGroup>
                                                    <InputGroup label="Buy Over Company Name" required error={errors.buyOverCompanyName}>
                                                        <input className="input-field" value={buyOverCompanyName} onChange={e => { setBuyOverCompanyName(e.target.value); clearError('buyOverCompanyName'); }} />
                                                    </InputGroup>
                                                    <InputGroup label="Company Account Name" required error={errors.buyOverAccountName}>
                                                        <input className="input-field" value={buyOverAccountName} onChange={e => { setBuyOverAccountName(e.target.value); clearError('buyOverAccountName'); }} />
                                                    </InputGroup>
                                                    <InputGroup label="Company Account Number" required error={errors.buyOverAccountNumber}>
                                                        <input className="input-field" value={buyOverAccountNumber} onChange={handleNumericChange(setBuyOverAccountNumber, 'buyOverAccountNumber')} />
                                                    </InputGroup>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <FileUpload
                                            id="govt_id"
                                            label="Government ID"
                                            required
                                            doc={uploadedDocs.govt_id}
                                            progress={uploadProgress.govt_id}
                                            error={errors.govt_id}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="work_id"
                                            label="Work ID"
                                            required
                                            doc={uploadedDocs.work_id}
                                            progress={uploadProgress.work_id}
                                            error={errors.work_id}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="payslip"
                                            label="Recent Payslip"
                                            required
                                            doc={uploadedDocs.payslip}
                                            progress={uploadProgress.payslip}
                                            error={errors.payslip}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="selfie"
                                            label="Selfie"
                                            doc={uploadedDocs.selfie}
                                            progress={uploadProgress.selfie}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="bank_statement"
                                            label="Bank Statement"
                                            required={(parseFloat(amount) || 0) > 500000}
                                            doc={uploadedDocs.bank_statement}
                                            progress={uploadProgress.bank_statement}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="proof_address"
                                            label="Proof of Residence"
                                            doc={uploadedDocs.proof_address}
                                            progress={uploadProgress.proof_address}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-black dark:text-white">References</h3>
                                        <button onClick={addReference} className="text-sm font-bold text-primary flex items-center gap-1 hover:text-primary/80 transition-colors">
                                            <span className="material-symbols-outlined text-lg">add_circle</span>
                                            Add Reference / Next of kin
                                        </button>
                                    </div>
                                    {references.map((ref, idx) => (
                                        <div key={idx} className="relative p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                                            {references.length > 1 && (
                                                <button onClick={() => removeReference(idx)} className="absolute top-4 right-4 text-slate-400 hover:text-red-500 transition-colors">
                                                    <span className="material-symbols-outlined">delete</span>
                                                </button>
                                            )}
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{idx + 1}</div>
                                                <h4 className="font-bold text-base text-slate-900 dark:text-white uppercase tracking-wider">Reference {idx === 0 && '(Required)'}</h4>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <InputGroup label="Full Name" error={errors[`ref_${idx}_fullName`]}>
                                                    <input className="input-field" value={ref.fullName} onChange={e => updateReference(idx, 'fullName', e.target.value)} />
                                                </InputGroup>
                                                <InputGroup label="Phone Number" error={errors[`ref_${idx}_phoneNumber`]}>
                                                    <input className="input-field" value={ref.phoneNumber} onChange={e => updateReference(idx, 'phoneNumber', e.target.value)} />
                                                </InputGroup>
                                                <InputGroup label="Relationship" error={errors[`ref_${idx}_relationship`]}>
                                                    <select className="input-field" value={ref.relationship} onChange={e => updateReference(idx, 'relationship', e.target.value)}>
                                                        <option value="">Select Relationship</option>
                                                        <option value="Colleague">Colleague</option>
                                                        <option value="Friend">Friend</option>
                                                        <option value="Family">Family</option>
                                                        <option value="Spouse">Spouse</option>
                                                        <option value="Other">Other</option>
                                                    </select>
                                                </InputGroup>
                                                <InputGroup label="Address" error={errors[`ref_${idx}_address`]}>
                                                    <input className="input-field" value={ref.address} onChange={e => updateReference(idx, 'address', e.target.value)} />
                                                </InputGroup>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-between items-center">
                    {!['topup', 're-app', 'add_on'].includes(loanType) && step > 0 ? (
                        <button onClick={handleBack} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Back
                        </button>
                    ) : (
                        <button onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Cancel
                        </button>
                    )}

                    {!['topup', 're-app', 'add_on'].includes(loanType) && step < steps.length - 1 ? (
                        <button onClick={handleNext} className="group px-10 py-4 rounded-2xl font-black text-white bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center gap-2">
                            Next Step <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={loading} className="group px-10 py-4 rounded-2xl font-black text-white bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 hover:shadow-green-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none flex items-center gap-2">
                            {loading ? (
                                <>Processing...</>
                            ) : (
                                <>Submit Application <span className="material-symbols-outlined">check_circle</span></>
                            )}
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                .input-field {
                    width: 100%;
                    height: 4rem;
                    padding: 0 1.5rem;
                    border-radius: 1rem;
                    border: 2px solid #f1f5f9;
                    background-color: #f8fafc;
                    color: #0f172a;
                    font-weight: 700;
                    font-size: 1.125rem;
                    outline: none;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .input-field:focus {
                    border-color: #028FF5;
                    background-color: white;
                    box-shadow: 0 0 0 4px rgba(2, 143, 245, 0.1);
                    transform: translateY(-1px);
                }
                .dark .input-field {
                    background-color: #0f172a;
                    border-color: #1e293b;
                    color: white;
                }
                .dark .input-field:focus {
                    border-color: #028FF5;
                    background-color: #1e293b;
                }
            `}</style>
        </div>
    );
};

export default StaffLoanForm;
