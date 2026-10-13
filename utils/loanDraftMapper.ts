import type { SavedDraft } from '../types';
import { TERTIARY_LIST } from '../components/MdaTertiarySelect';

const SELFIE_DUMMY_URL = 'https://identity.dojah.io/widget/selfie_dummy.jpg';

function parseReferences(raw: unknown): Array<{ name: string; phone: string; relationship: string }> {
  if (!raw) return [{ name: '', phone: '', relationship: '' }];
  const refs = typeof raw === 'string' ? (() => { try { return JSON.parse(raw); } catch { return []; } })() : raw;
  if (!Array.isArray(refs) || refs.length === 0) return [{ name: '', phone: '', relationship: '' }];
  return refs.map((ref: any) => ({
    name: ref?.fullName || ref?.name || '',
    phone: ref?.phoneNumber || ref?.phone || '',
    relationship: ref?.relationship || '',
  }));
}

function isValidSelfie(url?: string | null): boolean {
  return Boolean(url && url !== SELFIE_DUMMY_URL);
}

/** First LoanFlow sub-step (0–13) that still has missing required fields. */
export function resolveResumeSubStepFromLoan(loan: Record<string, any>): number {
  const productType = loan.product_type || loan.loan_type || '';
  const isPublic = String(productType).toLowerCase().includes('public') || String(productType).toLowerCase().includes('ippis');
  const selectedLoanId = isPublic ? 'public_sector' : (productType ? 'private_sector' : '');
  const isTertiary = TERTIARY_LIST.includes(loan.mda_tertiary);
  const amount = parseFloat(String(loan.requested_loan_amount || 0));
  const refs = parseReferences(loan.customer_references);
  const docs = {
    national_id: loan.govt_id_url,
    work_id: loan.work_id_url,
    payslip: loan.payslip_url,
    bank_statement: loan.statement_of_account_url,
    selfie: isValidSelfie(loan.selfie_verification_url) ? loan.selfie_verification_url : null,
  };

  const stepComplete = [
    () => Boolean(selectedLoanId),
    () => Boolean(loan.surname?.trim() && loan.first_name?.trim() && loan.is_politically_exposed !== null && loan.is_politically_exposed !== undefined),
    () => Boolean(loan.gender && loan.date_of_birth),
    () => Boolean(loan.mothers_maiden_name?.trim()),
    () => Boolean(loan.mobile_number?.length >= 10 && loan.personal_email?.trim()),
    () => Boolean(loan.bvn?.length === 11 && loan.nin?.length === 11),
    () => Boolean(loan.primary_home_address?.trim() && loan.state_of_residence),
    () => Boolean(loan.residential_status),
    () => {
      const incomeOk = Boolean(loan.average_monthly_income);
      if (selectedLoanId !== 'public_sector') return incomeOk;
      const mdaOk = Boolean(loan.mda_tertiary);
      const ippisOk = isTertiary || Boolean(loan.ippis_number);
      const staffOk = !isTertiary || Boolean(loan.staff_id);
      return incomeOk && mdaOk && ippisOk && staffOk;
    },
    () => Boolean(
      docs.national_id && docs.work_id && docs.payslip && docs.selfie &&
      (amount <= 500000 || docs.bank_statement)
    ),
    () => Boolean(
      loan.bank_name && /^\d{10}$/.test(String(loan.account_number || '')) && loan.account_name
    ),
    () => Boolean(
      loan.nok_name?.trim() && loan.nok_relationship && loan.nok_phone_number && loan.nok_address?.trim() &&
      refs[0]?.name?.trim() && refs[0]?.phone?.trim() && refs[0]?.relationship
    ),
    () => amount >= 100000,
    () => false,
  ];

  for (let i = 0; i < stepComplete.length; i++) {
    if (!stepComplete[i]()) return i;
  }
  return typeof loan.sub_step === 'number' ? loan.sub_step : 12;
}

/** Map a DB loan row (status=draft) into the SavedDraft shape LoanFlow expects. */
export function mapDbLoanToSavedDraft(loan: Record<string, any>): SavedDraft {
  const productType = loan.product_type || loan.loan_type || 'Personal Loan';
  const isPublic = String(productType).toLowerCase().includes('public') || String(productType).toLowerCase().includes('ippis');
  const resumeSubStep = resolveResumeSubStepFromLoan(loan);

  return {
    id: String(loan.id),
    type: 'LOAN',
    updatedAt: loan.updated_at ? new Date(loan.updated_at).getTime() : Date.now(),
    subStep: resumeSubStep,
    label: productType,
    data: {
      dbLoanId: loan.id,
      selectedLoanId: isPublic ? 'public_sector' : 'private_sector',
      title: loan.title || 'Mr',
      surname: loan.surname || '',
      firstName: loan.first_name || '',
      middleName: loan.middle_name || '',
      isOnBehalf: Boolean(loan.applying_for_others),
      representativeRelation: loan.relationship_to_applicant || '',
      isPep: loan.is_politically_exposed ?? null,
      gender: loan.gender || '',
      dob: loan.date_of_birth || '',
      maidenName: loan.mothers_maiden_name || '',
      maritalStatus: loan.marital_status || 'Single',
      religion: loan.religion || 'Prefer not to say',
      mobileNumber: loan.mobile_number || '',
      contactEmail: loan.personal_email || '',
      bvn: loan.bvn || '',
      nin: loan.nin || '',
      stateOfOrigin: loan.state_of_origin || '',
      stateOfResidence: loan.state_of_residence || '',
      homeAddress: loan.primary_home_address || '',
      residentialStatus: loan.residential_status || 'Rent',
      dependents: loan.number_of_dependents ?? 0,
      hasActiveLoans: loan.has_active_loans ? 'yes' : 'no',
      monthlyIncome: String(loan.average_monthly_income ?? ''),
      uploadedDocs: {
        national_id: loan.govt_id_url ? { name: 'Govt ID', size: 'Saved', url: loan.govt_id_url } : null,
        work_id: loan.work_id_url ? { name: 'Work ID', size: 'Saved', url: loan.work_id_url } : null,
        payslip: loan.payslip_url ? { name: 'Payslip', size: 'Saved', url: loan.payslip_url } : null,
        bank_statement: loan.statement_of_account_url ? { name: 'Bank Statement', size: 'Saved', url: loan.statement_of_account_url } : null,
        proof_address: loan.proof_of_residence_url ? { name: 'Proof of Address', size: 'Saved', url: loan.proof_of_residence_url } : null,
        selfie: isValidSelfie(loan.selfie_verification_url)
          ? { name: 'Selfie', size: 'Saved', url: loan.selfie_verification_url }
          : null,
      },
      references: parseReferences(loan.customer_references),
      desiredAmount: String(loan.requested_loan_amount ?? '100000'),
      repaymentPeriod: loan.loan_tenure_months ?? 12,
      mda: loan.mda_tertiary || '',
      customMda: '',
      ippisNumber: loan.ippis_number || '',
      staffId: loan.staff_id || '',
      referralCode: loan.referral_code || '',
      nokName: loan.nok_name || '',
      nokRelationship: loan.nok_relationship || '',
      nokAddress: loan.nok_address || '',
      nokPhoneNumber: loan.nok_phone_number?.replace(/^\+234/, '') || '',
      nokCountryCode: '+234',
      bankDetails: {
        bankName: loan.bank_name || '',
        accountNumber: loan.account_number || '',
        accountName: loan.account_name || '',
      },
    },
  };
}
