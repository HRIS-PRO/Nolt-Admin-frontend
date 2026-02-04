# Loan Application Data Fields

This document lists all the fields collected from users during the 13-step loan application process in the NOLT Finance platform.

## 1. Loan Type Selection
- **Loan Category**: Choice between `Business`, `Employees`, or `Niche`.
- **Specific Loan Product**: 
  - Business: `Working Capital`, `Asset Financing`, `LPO/Invoice Financing`.
  - Employees: `Salary Advance`, `Automobile Loan`, `Public Sector Loan (IPPIS)`.
  - Niche: `Travel Loan`, `Annuitant Loan`.

## 2. Identity Basics
- **Title**: User's prefix (Mr, Mrs, Ms, Dr).
- **Full Name**: Legal name of the borrower.
- **On Behalf Status**: Boolean flag indicating if filling for someone else.
- **Representative Relation**: Relationship to the applicant (if applicable).
- **PEP Status**: Explicit selection of Politically Exposed Person status (Yes or No).

## 3. Personal Details
- **Gender**: User's gender identity (Male, Female, Other).
- **Date of Birth**: Borrower's birth date (YYYY-MM-DD).

## 4. Further Details
- **Mother's Maiden Name**: Security verification field.
- **Religion**: Demographic info (Christianity, Islam, Other, Prefer not to say).
- **Marital Status**: Single, Married, Divorced, or Widowed.

## 5. Contact Information
- **Country Code**: International dialing code (e.g., +1).
- **Mobile Number**: Primary phone contact.
- **Email Address**: Digital contact for notifications and loan offers.

## 6. Verification
- **BVN**: 11-digit Bank Verification Number.
- **NIN**: 11-digit National Identity Number.

## 7. Address Details
- **State of Origin**: Borrower's home state.
- **State of Residence**: Current primary location.
- **Home Address**: Full residential street address.

## 8. Living Situation
- **Residential Status**: Rent, Mortgage, Own Outright, or With Parents.
- **Dependents**: Number of people financially reliant on the borrower.

## 9. Financial Health
- **Active Loans**: Flag indicating if the user currently has other outstanding loans.
- **Average Monthly Income**: The borrower's regular monthly earnings in USD.

## 10. Secure Vault (Document Uploads)
- **Government ID**: Image/PDF of Passport or National ID card.
- **Bank Statement**: Last 3 months of banking history (Required).
- **Proof of Address**: Utility bill or tenancy agreement.
- **Selfie Verification**: Digital photo for facial identity verification.

## 11. References
- **Reference Contacts (3 Required)**:
  - Full Name
  - Phone Number
  - Relationship (Family, Colleague, Friend, Manager)

## 12. Review & Customize
- **Requested Amount**: The final principal amount desired.
- **Repayment Period**: Tenure in months (ranging from 6 to 60 months).
- **AI Financial Advice**: Gemini-powered analysis based on Debt-to-Income ratio.

## 13. Indemnity & Signature
- **Indemnity Agreement**: Acceptance of legal terms and risk acknowledgments.
- **Digital Signature**: Hand-drawn signature captured via canvas.
- **Loan Agreement**: Generated PDF document available for download upon completion.