import React, { useState, useEffect } from 'react';
import axios from 'axios';
import MdaTertiarySelect, { TERTIARY_LIST } from './MdaTertiarySelect';

const STATIC_PRODUCTS = [
    { name: "NOLT IPPIS", code: "314", rate: "4% PER MONTH", icon: "inventory_2" },
    { name: "WORKING CAPITAL LOAN", code: "301", rate: "5% PER MONTH", icon: "inventory_2" },
    { name: "NOLT SALARY ADVANCE", code: "302", rate: "4% PER MONTH", icon: "inventory_2" },
    { name: "ANNUITANT LOAN", code: "303", rate: "CONFIRM FROM CBS", icon: "inventory_2" }
];

interface StaffLoanFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
    loanId?: string;
    user?: any;
    isCustomerVerified?: boolean;
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
    subtitle = "PDF, JPG, PNG UP TO 5MB",
    required = false,
    doc,
    progress,
    error,
    onSelect,
    onRemove
}: {
    id: string,
    label: string,
    subtitle?: string,
    required?: boolean,
    doc: any,
    progress: number | undefined,
    error?: string,
    onSelect: (id: string) => void,
    onRemove: (id: string, e: React.MouseEvent) => void
}) => {
    return (
        <div className="relative">
            {error && <span className="absolute -top-6 right-2 text-[10px] font-bold text-red-500 animate-in slide-in-from-left-2 z-10">{error}</span>}
            <div
                onClick={() => !doc && onSelect(id)}
                className={`relative w-full rounded-[2rem] border-2 p-6 flex flex-col justify-between min-h-[160px] transition-all duration-300 group cursor-pointer overflow-hidden
                    ${error ? 'border-red-300 bg-red-50/50' :
                        doc
                            ? 'border-emerald-500/20 bg-emerald-50/10'
                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0084FF]/40 hover:shadow-xl hover:shadow-blue-500/5 dark:hover:border-[#0084FF]/40'
                    }
                `}
            >
                {progress && !doc ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm z-10">
                        <div className="size-8 rounded-full border-4 border-slate-200 border-t-[#0084FF] animate-spin" />
                        <span className="text-[10px] font-black text-[#0084FF] uppercase tracking-wider">{progress}% UPLOADING</span>
                    </div>
                ) : null}

                <div className="flex justify-between items-start w-full">
                    <div className={`size-12 rounded-2xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300 ${
                        doc ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-500' : 'bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-[#0084FF] dark:group-hover:text-[#0084FF]'
                    }`}>
                        <span className="material-symbols-outlined text-2xl">{doc ? 'check_circle' : 'description'}</span>
                    </div>
                    {doc ? (
                        <button
                            type="button"
                            onClick={(e) => onRemove(id, e)}
                            className="size-8 rounded-full bg-red-50 text-red-500 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all duration-300 shadow-sm"
                        >
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                    ) : (
                        <span className="text-[10px] font-black text-[#0084FF] group-hover:underline uppercase tracking-wider mt-2">CLICK TO UPLOAD</span>
                    )}
                </div>

                <div className="mt-6">
                    <h5 className="font-black text-slate-800 dark:text-white tracking-tight uppercase text-sm leading-tight">
                        {label} {required && <span className="text-red-500">*</span>}
                    </h5>
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 tracking-wider mt-1 uppercase truncate w-full">
                        {doc ? doc.name : subtitle}
                    </p>
                </div>
            </div>
        </div>
    );
};


// --- Main Component ---

const StaffLoanForm: React.FC<StaffLoanFormProps> = ({ onClose, onSuccess, initialData, loanId, user, isCustomerVerified }) => {
    const [step, setStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [draftId] = useState(() => `L-DRAFT-${Date.now()}`); // Generate Draft ID for uploads
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [showProductSelect, setShowProductSelect] = useState(!loanId);
    const [selectedProductOption, setSelectedProductOption] = useState<any>(null);
    const [expandedSection, setExpandedSection] = useState<'identity' | 'address' | 'employment' | 'loan'>('loan');

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
    const [activeProducts, setActiveProducts] = useState<any[]>([]);
    const [isVerifyingBank, setIsVerifyingBank] = useState(false);
    const [bankVerificationResult, setBankVerificationResult] = useState<{
        account_name: string;
        isMatch: boolean;
        matchedNames: string[];
        reason: string;
    } | null>(null);
    const [bankVerificationError, setBankVerificationError] = useState<string | null>(null);

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

    // Next of Kin
    const [nokName, setNokName] = useState('');
    const [nokRelationship, setNokRelationship] = useState('');
    const [nokAddress, setNokAddress] = useState('');
    const [nokPhoneNumber, setNokPhoneNumber] = useState('');
    const [nokCountryCode, setNokCountryCode] = useState('+234');

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
            setMobileNumber(initialData.phone_number || initialData.mobile_number || '');
            setEmail(initialData.personal_email || '');
            setBvn(initialData.bvn || '');
            setNin(initialData.nin || '');

            setStateOfOrigin(initialData.state_of_origin || '');
            setStateOfResidence(initialData.state_of_residence || '');
            setResidentialStatus(initialData.residential_status || '');
            setAddress(initialData.address || initialData.primary_home_address || '');

            setMda(initialData.mda_tertiary || '');
            setIppisNumber(initialData.ippis_number || '');
            setStaffId(initialData.staff_id || '');
            setMonthlyIncome(initialData.average_monthly_income || '');

            setAmount(initialData.requested_loan_amount || '');
            setTenure(initialData.loan_tenure_months || 6);
            setLoanType(initialData.loan_type || 'new');

            // Populate New Fields
            setCasa(initialData.casa ? String(initialData.casa).split('.')[0] : '');
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

            // Populate NOK
            setNokName(initialData.nok_name || '');
            setNokRelationship(initialData.nok_relationship || '');
            setNokAddress(initialData.nok_address || '');
            if (initialData.nok_phone_number) {
                const phone = initialData.nok_phone_number;
                if (phone.startsWith('+')) {
                    setNokCountryCode(phone.substring(0, 4));
                    setNokPhoneNumber(phone.substring(4));
                } else {
                    setNokPhoneNumber(phone);
                }
            }

            // Bank Details
            setBankName(initialData.bank_name || '');
            setAccountNumber(initialData.account_number || '');
            setAccountName(initialData.account_name || '');
        }
    }, [initialData]);

    // Handle initial product selection and dynamic product matching
    useEffect(() => {
        if (activeProducts.length > 0) {
            const currentType = productType || initialData?.product_type;
            const match = currentType 
                ? activeProducts.find(p => 
                    p.custom_name.toLowerCase() === currentType.toLowerCase() || 
                    currentType.toLowerCase().includes(p.custom_name.toLowerCase()) ||
                    p.custom_name.toLowerCase().includes(currentType.toLowerCase())
                  )
                : activeProducts[0];
            
            if (match) {
                setSelectedProductOption(match);
                if (!productType) {
                    setProductType(match.custom_name);
                }
            }
        }
    }, [activeProducts, initialData]);

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

        const fetchActiveProducts = async () => {
            try {
                const response = await axios.get('/api/staff/products/loans/active');
                setActiveProducts(response.data);
            } catch (error) {
                console.error("Error fetching active products:", error);
            }
        };

        fetchBanks();
        fetchActiveProducts();
    }, []);

    // Auto-verify bank account when bank + 10-digit account number are both filled
    useEffect(() => {
        const selectedBank = bankList.find(b => b.name === bankName);
        if (!selectedBank || !/^\d{10}$/.test(accountNumber)) {
            setBankVerificationResult(null);
            setBankVerificationError(null);
            setAccountName('');
            return;
        }

        const verifyAccount = async () => {
            setIsVerifyingBank(true);
            setBankVerificationResult(null);
            setBankVerificationError(null);
            setAccountName('');

            try {
                const response = await axios.post('/api/misc/resolve-account', {
                    account_number: accountNumber,
                    bank_code: selectedBank.code,
                    first_name: firstName,
                    surname: surname
                });

                if (response.data.success) {
                    setBankVerificationResult(response.data.data);
                    setAccountName(response.data.data.account_name);
                } else {
                    setBankVerificationError(response.data.message || 'Verification failed.');
                }
            } catch (err: any) {
                const msg = err.response?.data?.message || 'Could not verify account. Please check the details.';
                setBankVerificationError(msg);
            } finally {
                setIsVerifyingBank(false);
            }
        };

        const timeout = setTimeout(verifyAccount, 500);
        return () => clearTimeout(timeout);
    }, [bankName, accountNumber, bankList]);

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
        formData.append('loan_id', loanId || draftId); // Pass real loan ID in edit mode, or draft ID

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

    const validateStep = (stepToCheck = step) => {
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
            if (bankVerificationResult && !bankVerificationResult.isMatch) newErrors.accountName = "Name mismatch";
            if (isVerifyingBank) newErrors.accountNumber = "Verifying...";

            if (!uploadedDocs.payslip) newErrors.payslip = "Required";

        } else {
            // Standard Wizard Validation
            if (stepToCheck === 0) { // Identity
                if (!surname.trim()) newErrors.surname = "Required";
                if (!firstName.trim()) newErrors.firstName = "Required";
                if (!gender) newErrors.gender = "Required";
                if (!dob) newErrors.dob = "Required";
                if (!religion) newErrors.religion = "Required";
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

            if (stepToCheck === 1) { // Address
                if (!stateOfOrigin) newErrors.stateOfOrigin = "Required";
                if (!stateOfResidence) newErrors.stateOfResidence = "Required";
                if (!residentialStatus) newErrors.residentialStatus = "Required";
                if (!address.trim()) newErrors.address = "Required";
            }

            if (stepToCheck === 2) { // Employment
                if (!mda) newErrors.mda = "Required";

                const isTertiary = TERTIARY_LIST.includes(mda);
                if (!isTertiary && !ippisNumber) newErrors.ippisNumber = "Required";
                if (isTertiary && !staffId) newErrors.staffId = "Required";

                if (!monthlyIncome) newErrors.monthlyIncome = "Required";
            }

            if (stepToCheck === 3) { // Loan
                if (!amount) newErrors.amount = "Required";
                else if (parseFloat(amount) < 100000) newErrors.amount = "Minimum ₦100,000";

                if (!bankName) newErrors.bankName = "Required";
                if (!accountNumber) {
                    newErrors.accountNumber = "Required";
                } else if (!/^\d{10}$/.test(accountNumber)) {
                    newErrors.accountNumber = "Must be 10 digits";
                }
                if (!accountName) newErrors.accountName = "Required";
                if (bankVerificationResult && !bankVerificationResult.isMatch) newErrors.accountName = "Name mismatch";
                if (isVerifyingBank) newErrors.accountNumber = "Verifying...";

                if (loanType === 'buy_over') {
                    if (!buyOverAmount) newErrors.buyOverAmount = "Required";
                    if (!buyOverCompanyName) newErrors.buyOverCompanyName = "Required";
                    if (!buyOverAccountName) newErrors.buyOverAccountName = "Required";
                    if (!buyOverAccountNumber) newErrors.buyOverAccountNumber = "Required";
                }
            }

            if (stepToCheck === 4) { // Documents
                if (!uploadedDocs.govt_id) newErrors.govt_id = "Required";
                if (!uploadedDocs.work_id) newErrors.work_id = "Required";
                if (!uploadedDocs.payslip) newErrors.payslip = "Required";

                // Bank Statement required for > 500k
                if ((parseFloat(amount) || 0) > 500000 && !uploadedDocs.bank_statement) {
                    newErrors.bank_statement = "Required for > ₦500k";
                }
            }

            if (stepToCheck === 5) { // References
                if (!nokName.trim()) newErrors.nokName = "Required";
                if (!nokRelationship) newErrors.nokRelationship = "Required";
                if (!nokPhoneNumber) {
                    newErrors.nokPhoneNumber = "Required";
                } else if (nokPhoneNumber.length < 10) {
                    newErrors.nokPhoneNumber = "Invalid Number";
                }
                if (!nokAddress.trim()) newErrors.nokAddress = "Required";

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

    const handleProductSelect = (p: any) => {
        setSelectedProductOption(p);
        setProductType(p.custom_name);
        clearError('productType');
    };

    const handleNext = () => {
        if (step === 0 && showProductSelect) {
            if (!productType) {
                alert("Please select a product first.");
                return;
            }
            setShowProductSelect(false);
            setErrors({});
            return;
        }

        if (step === 0 && !showProductSelect) {
            // Validate Address (Step 1)
            const isAddressValid = validateStep(1);
            if (!isAddressValid) {
                setExpandedSection('address');
                return;
            }
            // Validate Employment (Step 2)
            const isEmploymentValid = validateStep(2);
            if (!isEmploymentValid) {
                setExpandedSection('employment');
                return;
            }
            // Validate Loan (Step 3)
            const isLoanValid = validateStep(3);
            if (!isLoanValid) {
                setExpandedSection('loan');
                return;
            }
            // All valid, clear and go to documents step (4)
            setStep(4);
            setErrors({});
            return;
        }

        // Standard Validation for other steps
        if (validateStep(step)) {
            setStep(prev => Math.min(prev + 1, 6)); // Support up to Summary Step (6)
            setErrors({});
        }
    };

    const handleBack = () => {
        if (step === 6) {
            setStep(5);
            setErrors({});
            return;
        }
        if (step === 5) {
            setStep(4);
            setErrors({});
            return;
        }
        if (step === 4) {
            setStep(0);
            setShowProductSelect(false);
            setErrors({});
            return;
        }
        if (step === 0) {
            if (!showProductSelect && !loanId) {
                setShowProductSelect(true);
                setErrors({});
                return;
            }
        }
        // Otherwise trigger close
        onClose();
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

                    // Next of Kin
                    nok_name: nokName,
                    nok_relationship: nokRelationship,
                    nok_address: nokAddress,
                    nok_phone_number: `${nokCountryCode}${nokPhoneNumber}`,

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

    const renderStepIndicator = () => {
        if (['topup', 're-app', 'add_on'].includes(loanType)) return null;

        const visualSteps = [
            { label: "BVN LOOKUP", type: "checked" },
            { label: "CUSTOMER CARD", type: "checked" },
            { label: "LOAN DETAILS", number: 2, isActive: step < 4 },
            { label: "DOCUMENTS", number: 3, isActive: step === 4 },
            { label: "REFERENCES", number: 4, isActive: step === 5 },
            { label: "SUMMARY", number: 5, isActive: step === 6 }
        ];

        return (
            <div className="px-6 md:px-8 pt-8 pb-4 flex justify-between items-center relative max-w-4xl mx-auto w-full">
                {/* Horizontal progress background line */}
                <div className="absolute top-[2.5rem] left-[10%] right-[10%] h-[2px] bg-slate-100 dark:bg-slate-800 -z-10" />
                
                {visualSteps.map((s, idx) => {
                    const isChecked = s.type === "checked";
                    const isActive = s.isActive;
                    const isCompleted = !isChecked && !isActive && (
                        (s.label === "LOAN DETAILS" && step > 3) ||
                        (s.label === "DOCUMENTS" && step > 4) ||
                        (s.label === "REFERENCES" && step > 5)
                    );

                    return (
                        <div key={idx} className="flex flex-col items-center flex-1 relative z-10 select-none">
                            {isChecked || isCompleted ? (
                                <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                    <span className="material-symbols-outlined text-xl font-black">check</span>
                                </div>
                            ) : isActive ? (
                                <div className="w-10 h-10 rounded-full bg-[#0084FF] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10">
                                    {s.number}
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 flex items-center justify-center font-black text-sm">
                                    {s.number}
                                </div>
                            )}
                            <span className={`text-[9px] font-black uppercase tracking-widest mt-3 text-center leading-none ${
                                isActive ? 'text-blue-500' : isChecked || isCompleted ? 'text-slate-500' : 'text-slate-400'
                            }`}>
                                {s.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
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
                {renderStepIndicator()}

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
                                                    {[3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(m => (
                                                        <option key={m} value={m}>{m} Months</option>
                                                    ))}
                                                </select>
                                            </InputGroup>

                                            <InputGroup label="Bank Name" required error={errors.bankName}>
                                                <select className="input-field" value={bankName} onChange={e => { setBankName(e.target.value); setAccountName(''); clearError('bankName'); }}>
                                                    <option value="">Select Bank</option>
                                                    {bankList.map((b, i) => <option key={i} value={b.name}>{b.name}</option>)}
                                                </select>
                                            </InputGroup>

                                            <InputGroup label="Account Number" required error={errors.accountNumber}>
                                                <div className="relative">
                                                    <input
                                                        className={`input-field pr-10 ${
                                                            bankVerificationResult?.isMatch ? '!border-green-500' : bankVerificationResult && !bankVerificationResult.isMatch ? '!border-red-500' : ''
                                                        }`}
                                                        value={accountNumber}
                                                        onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 10) { setAccountNumber(val); setAccountName(''); clearError('accountNumber'); } }}
                                                        maxLength={10}
                                                        placeholder="10 Digits"
                                                    />
                                                    {isVerifyingBank && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                        </div>
                                                    )}
                                                    {!isVerifyingBank && bankVerificationResult?.isMatch && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <span className="material-symbols-outlined text-green-500 text-xl filled">check_circle</span>
                                                        </div>
                                                    )}
                                                    {!isVerifyingBank && bankVerificationResult && !bankVerificationResult.isMatch && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <span className="material-symbols-outlined text-red-500 text-xl filled">error</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </InputGroup>

                                            <InputGroup label="Account Name (Auto-Verified)" required error={errors.accountName}>
                                                <input
                                                    className={`input-field cursor-not-allowed ${
                                                        bankVerificationResult?.isMatch ? '!bg-green-50 dark:!bg-green-900/20 !border-green-500 !text-green-800 dark:!text-green-300'
                                                        : bankVerificationResult && !bankVerificationResult.isMatch ? '!bg-red-50 dark:!bg-red-900/20 !border-red-500 !text-red-800 dark:!text-red-300'
                                                        : ''
                                                    }`}
                                                    value={accountName}
                                                    readOnly
                                                    placeholder={isVerifyingBank ? 'Verifying...' : 'Auto-fills after verification'}
                                                />
                                            </InputGroup>

                                            {/* Bank Verification Status */}
                                            {bankVerificationResult && (
                                                <div className={`md:col-span-2 p-3 rounded-xl border flex items-start gap-2 animate-in fade-in duration-300 ${
                                                    bankVerificationResult.isMatch
                                                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                                                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                                                }`}>
                                                    <span className={`material-symbols-outlined text-lg filled ${bankVerificationResult.isMatch ? 'text-green-600' : 'text-red-600'}`}>
                                                        {bankVerificationResult.isMatch ? 'verified' : 'gpp_bad'}
                                                    </span>
                                                    <p className={`text-xs font-medium ${bankVerificationResult.isMatch ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                                        {bankVerificationResult.isMatch
                                                            ? `Verified: "${bankVerificationResult.account_name}" — matches (${bankVerificationResult.matchedNames.join(', ')}).`
                                                            : `"${bankVerificationResult.account_name}" does not match "${firstName} ${surname}". At least one name must match.`
                                                        }
                                                    </p>
                                                </div>
                                            )}
                                            {bankVerificationError && (
                                                <div className="md:col-span-2 p-3 rounded-xl border bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 flex items-start gap-2 animate-in fade-in duration-300">
                                                    <span className="material-symbols-outlined text-lg text-amber-600 filled">warning</span>
                                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">{bankVerificationError}</p>
                                                </div>
                                            )}
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
                            {step === 0 && showProductSelect && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto py-4">
                                    <div className="text-center space-y-3">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Select Loan Product</h3>
                                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                            The product selection drives what fields appear next.
                                        </p>
                                    </div>

                                    <div className="space-y-4 mt-8">
                                        {(activeProducts.length > 0 ? activeProducts : STATIC_PRODUCTS).map((p: any, idx: number) => {
                                            const isSelected = selectedProductOption ? (
                                                selectedProductOption.id ? selectedProductOption.id === p.id : selectedProductOption.name === p.name
                                            ) : false;
                                            const name = p.custom_name || p.name;
                                            const code = p.cba_product_code || p.code;
                                            const rate = p.interest_rate ? `${parseFloat(p.interest_rate)}% PER MONTH` : (p.rate || "CONFIRM FROM CBS");
                                            const icon = p.icon || "inventory_2";
                                            return (
                                                <div
                                                    key={p.id || idx}
                                                    onClick={() => handleProductSelect(p)}
                                                    className={`w-full rounded-[2rem] border-2 p-6 flex items-center justify-between transition-all duration-300 cursor-pointer overflow-hidden
                                                        ${isSelected 
                                                            ? 'border-[#0084FF] bg-[#0084FF] text-white shadow-xl shadow-blue-500/20' 
                                                            : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0084FF]/40'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center gap-6">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                                                            isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-400'
                                                        }`}>
                                                            <span className="material-symbols-outlined text-2xl">{icon}</span>
                                                        </div>
                                                        <div className="text-left">
                                                            <p className={`font-black tracking-tight text-base ${isSelected ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{name}</p>
                                                            <p className={`text-[10px] font-black uppercase tracking-wider mt-1 ${isSelected ? 'text-white/70' : 'text-slate-400 dark:text-slate-500'}`}>CODE: {code}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        isSelected ? 'bg-white/20 text-white' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                                                    }`}>
                                                        {rate}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {step === 0 && !showProductSelect && (
                                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto py-2">
                                    
                                    {/* Accordion 1: APPLICANT IDENTITY (Optional, collapsed details) */}
                                    <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300">
                                        <div 
                                            onClick={() => setExpandedSection(expandedSection === 'identity' ? 'loan' : 'identity')}
                                            className="p-6 flex justify-between items-center cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-2xl">person</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-base leading-none">Applicant Identity</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Verified Personal Details</p>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${expandedSection === 'identity' ? 'rotate-180' : ''}`}>
                                                keyboard_arrow_down
                                            </span>
                                        </div>
                                        {expandedSection === 'identity' && (
                                            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-6 animate-in fade-in duration-300">
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Title">
                                                        <select className="input-field animate-none animate-none" value={title} onChange={e => setTitle(e.target.value)} disabled={isCustomerVerified}>
                                                            <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
                                                        </select>
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Surname" required error={errors.surname}>
                                                        <input className="input-field" value={surname} onChange={e => { setSurname(e.target.value); clearError('surname'); }} placeholder="Surname" disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="First Name" required error={errors.firstName}>
                                                        <input className="input-field" value={firstName} onChange={e => { setFirstName(e.target.value); clearError('firstName'); }} placeholder="First Name" disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Middle Name">
                                                        <input className="input-field" value={middleName} onChange={e => setMiddleName(e.target.value)} placeholder="Optional" disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Gender" required error={errors.gender}>
                                                        <select className="input-field animate-none" value={gender} onChange={e => { setGender(e.target.value); clearError('gender'); }} disabled={isCustomerVerified}>
                                                            <option value="">Select</option><option>Male</option><option>Female</option>
                                                        </select>
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Date of Birth" required error={errors.dob}>
                                                        <input type="date" className="input-field animate-none" value={dob} onChange={e => { setDob(e.target.value); clearError('dob'); }} disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Marital Status" required error={errors.maritalStatus}>
                                                        <select className="input-field animate-none" value={maritalStatus} onChange={e => { setMaritalStatus(e.target.value); clearError('maritalStatus'); }}>
                                                            <option value="">Select</option><option>Single</option><option>Married</option><option>Divorced</option>
                                                        </select>
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Religion" required error={errors.religion}>
                                                        <select className="input-field animate-none" value={religion} onChange={e => { setReligion(e.target.value); clearError('religion'); }}>
                                                            <option value="">Select</option>
                                                            <option>Christianity</option>
                                                            <option>Islam</option>
                                                            <option>Others</option>
                                                        </select>
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Mobile Number" required error={errors.mobileNumber}>
                                                        <input className="input-field" value={mobileNumber} onChange={handleNumericChange(setMobileNumber, 'mobileNumber', 11)} placeholder="Mobile Number" maxLength={11} disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Email Address">
                                                        <input className="input-field" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email Address" />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="BVN" required error={errors.bvn}>
                                                        <input className="input-field" value={bvn} onChange={handleNumericChange(setBvn, 'bvn', 11)} maxLength={11} placeholder="BVN" disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="NIN" required error={errors.nin}>
                                                        <input className="input-field" value={nin} onChange={handleNumericChange(setNac => {}, 'nin', 11)} maxLength={11} placeholder="NIN" disabled={isCustomerVerified} />
                                                    </InputGroup>
                                                </div>
                                                <div className="md:col-span-4">
                                                    <InputGroup label="Mother's Maiden Name">
                                                        <input className="input-field" value={mothersMaidenName} onChange={e => setMothersMaidenName(e.target.value)} placeholder="Mother's Maiden Name" />
                                                    </InputGroup>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Accordion 2: RESIDENTIAL ADDRESS */}
                                    <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300">
                                        <div 
                                            onClick={() => setExpandedSection(expandedSection === 'address' ? 'loan' : 'address')}
                                            className="p-6 flex justify-between items-center cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#028FF5] flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-2xl">location_on</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-base leading-none">Residential Address</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Verification & Location Details</p>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${expandedSection === 'address' ? 'rotate-180' : ''}`}>
                                                keyboard_arrow_down
                                            </span>
                                        </div>
                                        {expandedSection === 'address' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-6 animate-in fade-in duration-300">
                                                <InputGroup label="State of Origin" required error={errors.stateOfOrigin}>
                                                    <select className="input-field animate-none" value={stateOfOrigin} onChange={e => { setStateOfOrigin(e.target.value); clearError('stateOfOrigin'); }}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </InputGroup>
                                                <InputGroup label="State of Residence" required error={errors.stateOfResidence}>
                                                    <select className="input-field animate-none" value={stateOfResidence} onChange={e => { setStateOfResidence(e.target.value); clearError('stateOfResidence'); }}>
                                                        <option value="">Select State</option>
                                                        {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                                                    </select>
                                                </InputGroup>
                                                <InputGroup label="Residential Status" required error={errors.residentialStatus}>
                                                    <select className="input-field animate-none" value={residentialStatus} onChange={e => { setResidentialStatus(e.target.value); clearError('residentialStatus'); }}>
                                                        <option value="">Select</option><option>Rent</option><option>Owned</option>
                                                    </select>
                                                </InputGroup>
                                                <InputGroup label="Home Address" required error={errors.address}>
                                                    <input className="input-field" value={address} onChange={e => { setAddress(e.target.value); clearError('address'); }} placeholder="Residential Address" />
                                                </InputGroup>
                                            </div>
                                        )}
                                    </div>

                                    {/* Accordion 3: EMPLOYMENT DETAILS */}
                                    <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300">
                                        <div 
                                            onClick={() => setExpandedSection(expandedSection === 'employment' ? 'loan' : 'employment')}
                                            className="p-6 flex justify-between items-center cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-orange-50 dark:bg-orange-950/50 text-[#F27A1A] flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-2xl">business</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-base leading-none">Employment Details</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Career & Income Information</p>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${expandedSection === 'employment' ? 'rotate-180' : ''}`}>
                                                keyboard_arrow_down
                                            </span>
                                        </div>
                                        {expandedSection === 'employment' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-6 animate-in fade-in duration-300">
                                                <div className="md:col-span-2">
                                                    <MdaTertiarySelect
                                                        label="MDA / Tertiary Institution *"
                                                        value={mda}
                                                        onChange={(val: string) => { setMda(val); clearError('mda'); }}
                                                        error={errors.mda}
                                                    />
                                                </div>
                                                <InputGroup label={`IPPIS Number ${TERTIARY_LIST.includes(mda) ? '(Optional)' : '*'}`} required={!TERTIARY_LIST.includes(mda)} error={errors.ippisNumber}>
                                                    <input className="input-field" value={ippisNumber} onChange={e => { setIppisNumber(e.target.value); clearError('ippisNumber'); }} placeholder="IPPIS Number" />
                                                </InputGroup>
                                                <InputGroup label={`Staff ID ${TERTIARY_LIST.includes(mda) ? '*' : '(Optional)'}`} required={TERTIARY_LIST.includes(mda)} error={errors.staffId}>
                                                    <input className="input-field" value={staffId} onChange={e => { setStaffId(e.target.value); clearError('staffId'); }} placeholder="Staff ID" />
                                                </InputGroup>
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Monthly Income" required error={errors.monthlyIncome}>
                                                        <input type="number" className="input-field animate-none" value={monthlyIncome} onChange={e => { setMonthlyIncome(e.target.value); clearError('monthlyIncome'); }} placeholder="Monthly Income (₦)" />
                                                    </InputGroup>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Accordion 4: LOAN CONFIGURATION */}
                                    <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden transition-all duration-300">
                                        <div 
                                            onClick={() => setExpandedSection(expandedSection === 'loan' ? 'address' : 'loan')}
                                            className="p-6 flex justify-between items-center cursor-pointer select-none"
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className="size-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-[#0F9F59] flex items-center justify-center shadow-sm">
                                                    <span className="material-symbols-outlined text-2xl">wallet</span>
                                                </div>
                                                <div className="text-left">
                                                    <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-wider text-base leading-none">Loan Configuration</h4>
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">Amount, Tenure & Disbursement</p>
                                                </div>
                                            </div>
                                            <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${expandedSection === 'loan' ? 'rotate-180' : ''}`}>
                                                keyboard_arrow_down
                                            </span>
                                        </div>
                                        {expandedSection === 'loan' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 pt-0 border-t border-slate-50 dark:border-slate-800/50 mt-6 animate-in fade-in duration-300">
                                                <div className="md:col-span-2">
                                                    <InputGroup label="Loan Type">
                                                        <select 
                                                            className="input-field animate-none" 
                                                            value={loanType} 
                                                            onChange={e => {
                                                                setLoanType(e.target.value);
                                                                clearError('loanType');
                                                                if (['topup', 're-app', 'add_on'].includes(e.target.value)) {
                                                                    setStep(0);
                                                                }
                                                            }}
                                                        >
                                                            <option value="new">New Loan</option>
                                                            <option value="topup">Top-up</option>
                                                            <option value="buy_over">Buy-over</option>
                                                            <option value="re-app">Re-app</option>
                                                            <option value="add_on">Add-on</option>
                                                        </select>
                                                    </InputGroup>
                                                </div>

                                                <InputGroup label="Loan Amount (₦)" required error={errors.amount}>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-slate-400">₦</span>
                                                        <input type="number" className="input-field pl-8 animate-none" value={amount} onChange={e => { setAmount(e.target.value); clearError('amount'); }} placeholder="0.00" />
                                                    </div>
                                                </InputGroup>
                                                <InputGroup label="Tenure (Months)">
                                                    <select className="input-field animate-none" value={tenure} onChange={e => setTenure(parseInt(e.target.value))}>
                                                        {Array.from({ length: 22 }, (_, i) => i + 3).map(m => (
                                                            <option key={m} value={m}>{m} Months</option>
                                                        ))}
                                                    </select>
                                                </InputGroup>

                                                {loanType === 'buy_over' && (
                                                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-800/40 rounded-3xl border border-slate-100 dark:border-slate-800/50 mt-2">
                                                        <div className="md:col-span-2">
                                                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                                                <span className="material-symbols-outlined text-lg">swap_horiz</span>
                                                                Buy Over Details
                                                            </h4>
                                                        </div>
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
                                                )}

                                                <div className="md:col-span-2 h-px bg-slate-50 dark:bg-slate-800/50 w-full my-2" />
                                                
                                                <div className="md:col-span-2">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-lg">credit_card</span>
                                                        Disbursement Channel
                                                    </h4>
                                                </div>

                                                <InputGroup label="Bank Name" required error={errors.bankName}>
                                                    <select className="input-field animate-none" value={bankName} onChange={e => { setBankName(e.target.value); setAccountName(''); clearError('bankName'); }}>
                                                        <option value="">Select Bank</option>
                                                        {bankList.map((bank: any) => (
                                                            <option key={bank.id} value={bank.name}>{bank.name}</option>
                                                        ))}
                                                    </select>
                                                </InputGroup>

                                                <InputGroup label="Account Number" required error={errors.accountNumber}>
                                                    <div className="relative">
                                                        <input
                                                            className={`input-field pr-10 ${
                                                                bankVerificationResult?.isMatch ? '!border-green-500' : bankVerificationResult && !bankVerificationResult.isMatch ? '!border-red-500' : ''
                                                            }`}
                                                            value={accountNumber}
                                                            onChange={e => { const val = e.target.value.replace(/\D/g, ''); if (val.length <= 10) { setAccountNumber(val); setAccountName(''); clearError('accountNumber'); } }}
                                                            maxLength={10}
                                                            placeholder="10 Digits"
                                                        />
                                                        {isVerifyingBank && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        )}
                                                        {!isVerifyingBank && bankVerificationResult?.isMatch && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <span className="material-symbols-outlined text-green-500 text-xl filled animate-in zoom-in-50 duration-300">check_circle</span>
                                                            </div>
                                                        )}
                                                        {!isVerifyingBank && bankVerificationResult && !bankVerificationResult.isMatch && (
                                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                <span className="material-symbols-outlined text-red-500 text-xl filled animate-in zoom-in-50 duration-300">error</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </InputGroup>

                                                <div className="md:col-span-2">
                                                    <InputGroup label="Account Name (Auto-Verified)" required error={errors.accountName}>
                                                        <input
                                                            className={`input-field cursor-not-allowed ${
                                                                bankVerificationResult?.isMatch ? '!bg-green-50/50 dark:!bg-green-950/20 !border-green-500/30 !text-green-700 dark:!text-green-300'
                                                                : bankVerificationResult && !bankVerificationResult.isMatch ? '!bg-red-50/50 dark:!bg-red-950/20 !border-red-500/30 !text-red-700 dark:!text-red-300'
                                                                : ''
                                                            }`}
                                                            value={accountName}
                                                            readOnly
                                                            placeholder={isVerifyingBank ? 'Verifying...' : 'Auto-fills after verification'}
                                                        />
                                                    </InputGroup>
                                                </div>

                                                {/* Bank Verification Status */}
                                                {bankVerificationResult && (
                                                    <div className={`md:col-span-2 p-4 rounded-2xl border flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
                                                        bankVerificationResult.isMatch
                                                            ? 'bg-green-50/40 dark:bg-green-950/10 border-green-200 dark:border-green-800/30 text-green-800 dark:text-green-300'
                                                            : 'bg-red-50/40 dark:bg-red-950/10 border-red-200 dark:border-red-800/30 text-red-800 dark:text-red-300'
                                                    }`}>
                                                        <span className={`material-symbols-outlined text-xl mt-0.5 filled`}>
                                                            {bankVerificationResult.isMatch ? 'verified' : 'gpp_bad'}
                                                        </span>
                                                        <div>
                                                            <p className="font-bold text-sm">
                                                                {bankVerificationResult.isMatch ? 'Account Verified ✓' : 'Name Mismatch Detected'}
                                                            </p>
                                                            <p className="text-xs mt-1 font-medium opacity-80">
                                                                {bankVerificationResult.isMatch
                                                                    ? `Resolved: "${bankVerificationResult.account_name}" — matches applicant name (${bankVerificationResult.matchedNames.join(', ')}).`
                                                                    : `Resolved: "${bankVerificationResult.account_name}" — does not match "${firstName} ${surname}". At least the first name or surname must appear in the account name.`
                                                                }
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                                {bankVerificationError && (
                                                    <div className="md:col-span-2 p-4 rounded-2xl border bg-amber-50/40 dark:bg-amber-950/10 border-amber-200 dark:border-amber-800/30 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300 text-amber-800 dark:text-amber-300">
                                                        <span className="material-symbols-outlined text-xl mt-0.5 filled">warning</span>
                                                        <div>
                                                            <p className="font-bold text-sm">Verification Failed</p>
                                                            <p className="text-xs mt-1 font-medium opacity-80">{bankVerificationError}</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                </div>
                            )}

                            {step === 4 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto py-2">
                                    <div className="text-center space-y-3 mb-6">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Document Verification</h3>
                                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                            Upload clear, scanned copies of supporting documents
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <FileUpload
                                            id="govt_id"
                                            label="Government ID"
                                            subtitle="PASSPORT, DRIVER LICENSE, ETC."
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
                                            subtitle="VALID COMPANY/ORG ID"
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
                                            subtitle="MUST BE FROM LAST 3 MONTHS"
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
                                            subtitle="REAL-TIME FACIAL CAPTURE"
                                            doc={uploadedDocs.selfie}
                                            progress={uploadProgress.selfie}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="bank_statement"
                                            label="Bank Statement"
                                            subtitle="6 MONTHS STAMPED STATEMENT"
                                            required={(parseFloat(amount) || 0) > 500000}
                                            doc={uploadedDocs.bank_statement}
                                            progress={uploadProgress.bank_statement}
                                            error={errors.bank_statement}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                        <FileUpload
                                            id="proof_address"
                                            label="Proof of Residence"
                                            subtitle="UTILITY BILL OR RENT RECEIPT"
                                            doc={uploadedDocs.proof_address}
                                            progress={uploadProgress.proof_address}
                                            onSelect={handleFileSelect}
                                            onRemove={removeDoc}
                                        />
                                    </div>
                                </div>
                            )}

                            {step === 5 && (
                                <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500 max-w-4xl mx-auto py-2">
                                    <div className="text-center space-y-3 mb-6">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Guarantors & References</h3>
                                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                            Provide at least one verified personal reference
                                        </p>
                                    </div>

                                    {/* Next of Kin Section */}
                                    <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6 shadow-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 flex items-center justify-center">
                                                <span className="material-symbols-outlined text-xl">family_history</span>
                                            </div>
                                            <h3 className="text-lg font-black dark:text-white uppercase tracking-wider">Next of Kin</h3>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <InputGroup label="Full Name" required error={errors.nokName}>
                                                <input
                                                    className="input-field"
                                                    value={nokName}
                                                    onChange={e => { setNokName(e.target.value); if(errors.nokName) setErrors(prev => { const n = {...prev}; delete n.nokName; return n; }); }}
                                                    placeholder="Full Name"
                                                />
                                            </InputGroup>
                                            <InputGroup label="Relationship" required error={errors.nokRelationship}>
                                                <select
                                                    className="input-field animate-none"
                                                    value={nokRelationship}
                                                    onChange={e => { setNokRelationship(e.target.value); if(errors.nokRelationship) setErrors(prev => { const n = {...prev}; delete n.nokRelationship; return n; }); }}
                                                >
                                                    <option value="">Select Relationship</option>
                                                    <option value="Husband">Husband</option>
                                                    <option value="Wife">Wife</option>
                                                    <option value="Brother">Brother</option>
                                                    <option value="Sister">Sister</option>
                                                    <option value="Mother">Mother</option>
                                                    <option value="Father">Father</option>
                                                    <option value="Son">Son</option>
                                                    <option value="Daughter">Daughter</option>
                                                    <option value="Other">Other</option>
                                                </select>
                                            </InputGroup>
                                            <InputGroup label="Phone Number" required error={errors.nokPhoneNumber}>
                                                <div className="flex gap-2">
                                                    <select
                                                        className="input-field !w-24 px-2 text-center animate-none"
                                                        value={nokCountryCode}
                                                        onChange={e => setNokCountryCode(e.target.value)}
                                                    >
                                                        <option value="+234">+234</option>
                                                    </select>
                                                    <input
                                                        className="input-field flex-1"
                                                        value={nokPhoneNumber}
                                                        onChange={e => {
                                                            const val = e.target.value.replace(/\D/g, '');
                                                            if (val.length <= 11) {
                                                                setNokPhoneNumber(val);
                                                                if(errors.nokPhoneNumber) setErrors(prev => { const n = {...prev}; delete n.nokPhoneNumber; return n; });
                                                            }
                                                        }}
                                                        placeholder="8012345678"
                                                    />
                                                </div>
                                            </InputGroup>
                                            <InputGroup label="Contact Address" required error={errors.nokAddress}>
                                                <div className="relative">
                                                    <input
                                                        className="input-field pr-24"
                                                        value={nokAddress}
                                                        onChange={e => { setNokAddress(e.target.value); if(errors.nokAddress) setErrors(prev => { const n = {...prev}; delete n.nokAddress; return n; }); }}
                                                        placeholder="Full Home Address"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNokAddress(address);
                                                            if(errors.nokAddress) setErrors(prev => { const n = {...prev}; delete n.nokAddress; return n; });
                                                        }}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary uppercase tracking-widest hover:underline"
                                                    >
                                                        Same as mine
                                                    </button>
                                                </div>
                                            </InputGroup>
                                        </div>
                                    </div>

                                    {/* References Section */}
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-center px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-xl">contacts</span>
                                                </div>
                                                <h3 className="text-lg font-black dark:text-white uppercase tracking-wider">References</h3>
                                            </div>
                                        </div>

                                        {references.map((ref, idx) => (
                                            <div key={idx} className="relative rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 space-y-6 shadow-sm">
                                                {references.length > 1 && (
                                                    <button onClick={() => removeReference(idx)} className="absolute top-6 right-6 w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-all shadow-sm">
                                                        <span className="material-symbols-outlined text-base">close</span>
                                                    </button>
                                                )}
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{idx + 1}</div>
                                                    <h4 className="font-black text-sm text-slate-800 dark:text-white uppercase tracking-wider">Reference {idx === 0 && '(Required)'}</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <InputGroup label="Reference Full Name" error={errors[`ref_${idx}_fullName`]}>
                                                        <input className="input-field" value={ref.fullName} onChange={e => updateReference(idx, 'fullName', e.target.value)} placeholder="Full Name" />
                                                    </InputGroup>
                                                    <InputGroup label="Phone Number" error={errors[`ref_${idx}_phoneNumber`]}>
                                                        <input className="input-field" value={ref.phoneNumber} onChange={e => updateReference(idx, 'phoneNumber', e.target.value)} placeholder="Phone Number" />
                                                    </InputGroup>
                                                    <InputGroup label="Relationship" error={errors[`ref_${idx}_relationship`]}>
                                                        <select className="input-field animate-none animate-none" value={ref.relationship} onChange={e => updateReference(idx, 'relationship', e.target.value)}>
                                                            <option value="">Select Relationship</option>
                                                            <option value="Colleague">Colleague</option>
                                                            <option value="Friend">Friend</option>
                                                            <option value="Family">Family</option>
                                                            <option value="Spouse">Spouse</option>
                                                            <option value="Sibling">Sibling</option>
                                                            <option value="Other">Other</option>
                                                        </select>
                                                    </InputGroup>
                                                    <InputGroup label="Residential Address" error={errors[`ref_${idx}_address`]}>
                                                        <input className="input-field" value={ref.address} onChange={e => updateReference(idx, 'address', e.target.value)} placeholder="Residential Address" />
                                                    </InputGroup>
                                                </div>
                                            </div>
                                        ))}

                                        {references.length < 2 && (
                                            <button 
                                                onClick={addReference} 
                                                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-primary/50 text-slate-400 hover:text-primary transition-all rounded-[2rem] flex items-center justify-center gap-2 group"
                                            >
                                                <span className="material-symbols-outlined text-lg group-hover:scale-110 transition-transform">add_circle</span>
                                                <span className="text-xs font-black uppercase tracking-widest">Add Second Reference</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}

                            {step === 6 && (
                                <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500 max-w-4xl mx-auto py-4 flex flex-col items-center">
                                    
                                    <div className="size-24 rounded-3xl bg-[#0084FF]/10 text-[#0084FF] flex items-center justify-center shadow-xl shadow-blue-500/5 mb-4">
                                        <span className="material-symbols-outlined text-5xl">task</span>
                                    </div>

                                    <div className="text-center space-y-3 mb-6">
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Review Application</h3>
                                        <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-relaxed">
                                            Verify all details before final submission to CBS
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
                                        {/* Left Card: CUSTOMER & LOAN */}
                                        <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                                            <div>
                                                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">CUSTOMER & LOAN</span>
                                                <h4 className="text-2xl font-black text-slate-900 dark:text-white uppercase mt-4 italic leading-tight">{firstName} {surname}</h4>
                                                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{productType} ({selectedProductOption?.code || 'CBS'})</p>
                                            </div>
                                            <div className="mt-8">
                                                <p className="text-3xl font-black text-emerald-500 tracking-tight leading-none">
                                                    ₦ {parseFloat(amount || '0').toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Right Card: STATUS & VERIFICATION */}
                                        <div className="rounded-[2.5rem] border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 flex flex-col justify-between shadow-sm min-h-[220px]">
                                            <div>
                                                <span className="text-[10px] font-black tracking-widest uppercase text-slate-400 dark:text-slate-500">STATUS & VERIFICATION</span>
                                            </div>
                                            <div className="space-y-4 mt-6">
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">DOCUMENTS</span>
                                                    <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">UPLOADED</span>
                                                </div>
                                                <div className="h-px bg-slate-50 dark:bg-slate-800/50 w-full" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">REFERENCES</span>
                                                    <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">VERIFIED</span>
                                                </div>
                                                <div className="h-px bg-slate-50 dark:bg-slate-800/50 w-full" />
                                                <div className="flex justify-between items-center">
                                                    <span className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">CASA LINK</span>
                                                    <span className={`text-xs font-black uppercase tracking-widest ${casa ? 'text-emerald-500' : 'text-slate-400'}`}>
                                                        {casa ? 'ACTIVE' : 'NOT ACTIVE'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-between items-center">
                    {!['topup', 're-app', 'add_on'].includes(loanType) && (step > 0 || (step === 0 && !showProductSelect && !loanId)) ? (
                        <button type="button" onClick={handleBack} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Back
                        </button>
                    ) : (
                        <button type="button" onClick={onClose} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-all">
                            Cancel
                        </button>
                    )}

                    {['topup', 're-app', 'add_on'].includes(loanType) ? (
                        <button onClick={handleSubmit} disabled={loading} className="group px-10 py-4 rounded-2xl font-black text-white bg-green-500 hover:bg-green-600 shadow-xl shadow-green-500/20 hover:shadow-green-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-green-600">
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                </div>
                            )}
                            <span className={loading ? 'opacity-0 flex items-center gap-2' : 'flex items-center gap-2'}>
                                Submit Application <span className="material-symbols-outlined">check_circle</span>
                            </span>
                        </button>
                    ) : step === 6 ? (
                        <button onClick={handleSubmit} disabled={loading} className="group px-10 py-4 rounded-2xl font-black text-white bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:-translate-y-1 transition-all disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none disabled:cursor-not-allowed flex items-center gap-2 relative overflow-hidden">
                            {loading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-emerald-600">
                                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                </div>
                            )}
                            <span className={loading ? 'opacity-0 flex items-center gap-2' : 'flex items-center gap-2'}>
                                Final Submission <span className="material-symbols-outlined text-base">send</span>
                            </span>
                        </button>
                    ) : (
                        <button 
                            onClick={handleNext} 
                            disabled={step === 0 && showProductSelect && !productType}
                            className={`group px-10 py-4 rounded-2xl font-black text-white bg-[#0084FF] hover:bg-blue-600 shadow-xl shadow-blue-500/20 hover:shadow-blue-500/30 hover:-translate-y-1 transition-all flex items-center gap-2
                                ${step === 0 && showProductSelect && !productType ? 'opacity-40 cursor-not-allowed pointer-events-none hover:translate-y-0 shadow-none' : ''}
                            `}
                        >
                            {step === 0 && showProductSelect && "Next Step"}
                            {step === 0 && !showProductSelect && "Next Step: Documents"}
                            {step === 4 && "Continue to References"}
                            {step === 5 && "Review Application"}
                            <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </button>
                    )}
                </div>
            </div>
            <style>{`
                .input-field {
                    width: 100%;
                    height: 3.25rem;
                    padding: 0 1.25rem;
                    border-radius: 0.875rem;
                    border: 2px solid #f1f5f9;
                    background-color: #f8fafc;
                    color: #0f172a;
                    font-weight: 700;
                    font-size: 0.95rem;
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
