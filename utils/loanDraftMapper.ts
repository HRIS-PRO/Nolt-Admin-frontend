import type { SavedDraft } from '../types';

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

/** Map a DB loan row (status=draft) into the SavedDraft shape LoanFlow expects. */
export function mapDbLoanToSavedDraft(loan: Record<string, any>): SavedDraft {
  const productType = loan.product_type || loan.loan_type || 'Personal Loan';
  const isPublic = String(productType).toLowerCase().includes('public') || String(productType).toLowerCase().includes('ippis');

  return {
    id: String(loan.id),
    type: 'LOAN',
    updatedAt: loan.updated_at ? new Date(loan.updated_at).getTime() : Date.now(),
    subStep: typeof loan.sub_step === 'number' ? loan.sub_step : 1,
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
        selfie: loan.selfie_verification_url ? { name: 'Selfie', size: 'Saved', url: loan.selfie_verification_url } : null,
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
