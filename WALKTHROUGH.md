
# NOLT Finance: Application Walkthrough & Tasks

## User Journey: Investment Flow
The investment flow is designed to be "KYC-First," ensuring the user is fully verified before configuring their financial contribution.

1.  **Plan Selection**: User chooses between **NOLT Rise** (High Growth) or **NOLT Vault** (Fixed Deposit).
2.  **Identity Basics**: Collection of Title, Full Name, and PEP (Politically Exposed Person) status.
3.  **Personal Details**: Gender and Date of Birth verification.
4.  **Further Details**: Marital Status, Mother's Maiden Name, and Religion (for specific demographic tailoring).
5.  **Contact Information**: Mobile Number and Email address.
6.  **Verification**: Collection of BVN and NIN.
7.  **Address Details**: State of Origin, State of Residence, and Home Address.
8.  **Next of Kin**: Critical backup contact including Name, Relationship, and Address.
9.  **Secure Vault**: Encryption-backed document upload (ID Card, Utility Bill).
10. **Investment Configuration**: (Post-KYC) The user defines their investment amount, tenure, and rollover options.
11. **Payment Notice**: Instruction for manual bank transfer to the NOLT corporate account.

## User Journey: Loan Flow
1.  **Loan Type Selection**: Choose from Business, Salary Advance, IPPIS, etc.
2.  **KYC Profile**: Similar to Investment flow but includes **Living Situation** (Rent/Own) and **Financials** (Monthly Income).
3.  **References**: Three professional/personal contacts required.
4.  **Loan Customization**: Final slider for Amount and Tenure before AI Financial Advisory provides tips.

## Implementation Tasks (Completed)
- [x] Implement #028FF5 theme throughout.
- [x] Synchronize KYC fields between Loan and Investment flows.
- [x] Reorder Investment steps: KYC -> Vault -> Configuration.
- [x] Add Next of Kin step to the core Investment logic.
- [x] Ensure 100% responsive UI for all 11 sub-steps.
