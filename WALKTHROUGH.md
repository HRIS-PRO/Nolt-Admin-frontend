# NMS Frontend — User stories & operational guide

This document describes **how people use the NOLT Management System (NMS)** in the browser: staff console (`/staff/*`) and customer portal (`/dashboard`, `/loan`, `/investment`, etc.). It is written for **product, support, training, and UAT** — not for developers tracing code.

For API stages, backend rules, and environment variables, see the monorepo guide: **[../walkthrough.md](../walkthrough.md)**.

---

## 1. What NMS is

NMS is the web application where:

- **Staff** originate and approve **loans** and **investments**, manage **customers**, run **reports**, and configure parts of the platform.
- **Customers** apply for **loans** and **investments**, manage **profile/KYC**, and track **applications**.

Everything runs in one React app; after login you land in either the **staff sidebar experience** or the **customer dashboard**, depending on your account role.

---

## 2. Who sees what (roles & navigation)

The left sidebar (**StaffLayout**) shows menu items based on your role. If you do not see a module, your role is not meant to use it — do not share super-admin credentials to work around this.

| Menu item | Typical roles | Purpose |
|-----------|---------------|---------|
| **Dashboard** | Most staff | Landing page and shortcuts |
| **Loans** | Sales, CX, credit, audit, finance, marketing (view) | Loan queue and detail |
| **Investment** | Sales, compliance, finance, marketing | Investment queue and detail |
| **Transfers** | Super Admin only | Staff transfer operations |
| **Products** | Most staff except Customer Experience | Loan/investment product catalog |
| **Promotions** | Super Admin, Marketing | Campaigns for mobile/web |
| **Push Notifications** | Super Admin only | Mobile push campaigns |
| **Reports** | Managers, finance, credit, audit, compliance, MD, HR, CX, admin | Operational exports |
| **BI Dashboard** | Same group as Reports | Timeline / analytics |
| **Calculator** | Staff | Loan/investment calculator |
| **Settings** | All staff (sections vary by role) | Password, GL wrapper, agent tiers |
| **Users** | Super Admin only | Staff invites and roles |
| **Customers** | Super Admin, Customer Experience | Customer 360° and onboarding |
| **Audit Trail** | Super Admin only | System audit log |
| **CBA Migration** | Super Admin only | CBA environment alignment tools |

**Sales / agent roles:** On investments, you usually only see deals **attributed to you**. Commission amounts are hidden on other officers’ deals unless you are Super Admin.

**Marketing:** Sidebar is limited to Dashboard, Loans, Investment, and Promotions.

**Finance:** Loan list is focused on **finance** and **disbursed** stages for disbursement work.

---

## 3. Platform limits and global rules

### 3.1 Document uploads (staff & customer portal)

- **Maximum size:** **10 MB per file** for documents sent through NMS **`/api/upload`** (loan docs, investment docs, utility bills, indemnity uploads, customer profile bill, etc.).
- **What happens if too large:** The app shows a **“Attachments on NMS must be 10 MB or smaller”** modal before upload; the server also rejects oversize files.
- **Do:** Compress PDFs or reduce image resolution before upload.
- **Do not:** Assume the bank or CBA accepts huge files — NMS enforces 10 MB regardless.

**Exceptions (different limits):**

- **Product marketing images** and **mobile home banners** use separate, smaller limits in their own screens.
- **Payroll CSV** upload allows a much larger file (MDA payroll flow).
- **Bulk staff invite CSV** is CSV-only with its own cap.

### 3.2 Sessions and access

- Staff and customers sign in with **email/password** (and verification where required). Sessions are cookie-based.
- **Do not** use customer login for staff URLs (`/staff/*`) or vice versa.
- Staff accounts without the right role receive **restricted** or empty views — that is intentional.

### 3.3 Core banking (CBA)

Many actions **call CBA in the background** (account creation, fixed deposit, disbursement, account detail sync). If CBA is down or misconfigured:

- NMS may **save data locally** but show a **warning** that core banking sync failed.
- **Do:** Read the on-screen message, note the time, and escalate to ops with customer ID / loan ID.
- **Do not:** Assume “Saved successfully” always means CBA was updated — check for **core banking sync** messages on customer profile save.

### 3.4 Bot protection (where enabled)

Some public or sensitive flows may show **Cloudflare Turnstile**. Complete the check before submitting forms.

---

## 4. Staff user stories — Customers module

**Who:** Super Admin, Customer Experience  
**Where:** **Customers** → search/open customer → **Customer details**

### 4.1 Viewing a customer

**Story:** As staff, I open a customer record to see identity, loans, investments, and actions in one place.

**Tabs:**

1. **Identity & KYC** — Tier 1/2/3 blocks (personal data, next of kin, Tier 3 verification and utility bill).
2. **Loan** — NMS loans plus optional CBA loan snapshot.
3. **Investment** — NMS investments plus optional CBA investment snapshot.
4. **Bill payments** — Where enabled.
5. **Audit log** — Customer-related activity context.

**Quick actions (sidebar):** Freeze account, send message (where configured).

### 4.2 Editing customer profile (Tier 1 / 2 / 3)

**Story:** As CX or Super Admin, I correct or complete customer data after verification.

**Tier 1 — Identity, contact & documents**

- **BVN verified name** is read-only (from BVN verification).
- **Preferred name** fields are editable (what the customer wants on correspondence).
- Editable: email, phone, DOB, gender, marital status, states, registered address, BVN, NIN, employment fields on the latest loan context.
- **Utility bill:** Upload for Tier 3 address proof (10 MB limit).

**How to save:** Click the **pencil** on the tier section → edit → **Save**.

**CBA account update (important):**

- After you **Save**, if the customer has a **CASA** on file, NMS pushes updated KYC to core banking (**CreateAccountUpdate** — names, BVN, NIN, contact, address, etc.; **not** tier changes).
- **Success:** “Saved successfully.”
- **Partial success:** “Saved in NMS, but core banking sync failed…” — data is in NMS; retry later or escalate with logs.
- **No CASA:** Save still works; no CBA call until the customer is registered on CBA.

**Do:**

- Fix preferred names and contact details when the customer requests it.
- Select marital status and gender from dropdowns before save when required for downstream products.

**Do not:**

- Expect tier upgrades from this screen alone — tier rules follow KYC policy and other flows.
- Ignore a core banking sync failure if the customer’s bank account must match NMS for loans/disbursement.

### 4.3 Loan eligibility, blacklist, and cooldown

**Story:** As authorized staff, I see whether this customer may start a **new** loan application.

**Banners:**

- **Blacklisted** — blocked until a date; reason may show.
- **Rejection cooldown** — recent loan rejection blocked reapply until a date (often 30 days at BVN level).

**Actions (if your role allows):** Blacklist, unblacklist (with reason where required).

**Do not:**

- Start a **new staff loan** for a blocked customer without clearing eligibility through process (unblacklist / cooldown expiry / support procedure).

### 4.4 Onboarding a new customer (modal / flow)

**Story:** As CX or Super Admin, I onboard a customer who is not yet in NMS.

**Step 0 — BVN verification**

1. Enter **11-digit BVN**.
2. **Verify & Continue** runs **Prembly BVN advance** (full identity where available).
3. If advance **fails**, use **Retry with BVN basic**:
   - Basic returns: **first, middle, last name**, **date of birth**, **phone** (and watchlist flags if any).
   - **You must manually enter:** title, email, gender, marital status, NIN, address, states, and other required fields on the next step.

**Step 1 — Personal details**

- BVN legal name is **read-only**; **preferred name** is editable.
- Complete all **required** fields (including NIN) before continuing.

**Step 2 — Tier 3**

- Upload **utility bill** (10 MB max) for address verification path.

**Onboard submit**

- NMS creates the customer, registers on **CBA** when possible, sends credentials, and syncs KYC to CBA after account creation.
- A **processing overlay** runs during CBA — do not close the browser until it finishes or times out; use retry paths if offered.

**Do:**

- Use **basic BVN** only when advance fails — then carefully complete missing fields.
- Upload a clear utility bill.

**Do not:**

- Skip BVN lookup and duplicate customers with the same BVN.
- Proceed without NIN when the form requires it.

### 4.5 Other customer actions

- **Send password** — triggers reset/set password communication.
- **Retry CBA registration** — when profile exists but CASA/CBA ID missing (Super Admin / support paths).
- **Mobile devices** — list/revoke active mobile app bindings where shown.
- **CBA retry** from customer view — follow on-screen steps; account sync runs after success.

---

## 5. Staff user stories — Loans

**Where:** **Loans** list → open loan → **Loan details**

### 5.1 Loan pipeline (happy path)

**Story:** As staff in my role, I move a loan through stages until disbursement.

Typical forward path:

`submitted` → `sales` → `customer_experience` → `credit_check_1` → `credit_check_2` → `internal_audit` → `finance` → `disbursed`

At each stage you only see actions your **role** is allowed to perform.

**Credit Check 1:** Enter **eligible amount**, tenure, fees, disbursement details — required before approval.

**Credit Check 2:** Second credit approval.

**Internal Audit:** Audit approval before finance.

**Finance:** Confirms disbursement; triggers **CBA transfer**. On failure, loan may flag **finance disbursement failed** — Finance receives alert email.

**Finance override (when visible):** Only after a **failed** disburse attempt flag — Super Admin / Finance uses **Override** on loan detail to retry CBA transfer, then mark disbursed.

### 5.2 Reject, return, approve

**Approve:** Moves to next stage if validations pass.

**Return:** Sends back to an earlier stage (e.g. CX returns to sales for corrections). Pick the **target stage** and reason as prompted.

**Reject (Sales / CX):**

- **Must** select an official **CX rejection reason** (customer may be emailed).
- May start a **BVN-level cooldown** (e.g. 30 days) — customer cannot reapply until expiry.

**Do:**

- Always choose a real rejection reason code.
- Upload all mandatory documents before pushing to credit (ID, payslip, selfie rules per product amount).

**Do not:**

- Reject without reason when the UI requires it.
- Assume changing loan stage in the database clears cooldown — cooldown is separate from stage.

### 5.3 Starting a loan on behalf of a customer

**Story:** As sales staff, I create a loan application for a customer (including walk-in).

**Flow (high level):**

1. Start **new loan** from staff loans area (or customer context).
2. If customer is **ineligible** (blacklist/cooldown), the flow **blocks** with explanation — stop or fix eligibility first.
3. Complete identity steps, employment, amount, documents (each file ≤ 10 MB).
4. References, indemnity/signature where required.
5. Submit — application enters queue at **submitted** / **sales** per rules.

**Documents:** Each slot expects a **distinct file** — same filename cannot be reused across slots in one application.

**Large loans:** Amount thresholds may require **bank statement** upload — follow on-screen prompts.

### 5.4 Loan detail — documents and comments

- Upload supporting docs while stage allows (not in draft-only states where disabled).
- Indemnity: signature pad or uploaded indemnity file (size limit applies).
- Watch for **real-time** updates if another user acts on the same loan.

---

## 6. Staff user stories — Investments

**Where:** **Investment** list → **Staff investments** wizard or **Investment detail** (`/staff/investments/:id`)

### 6.1 Staff-led investment application

**Story:** As sales, I register an investment for a customer (individual or corporate paths).

**Flow (conceptual):**

1. Choose product/plan (Rise, Vault, Surge, etc.), amount, tenure, payout/rollover options.
2. Collect **KYC documents** per product (IDs, selfie, corporate docs for business) — 10 MB each.
3. Payment method: online or **bank transfer** with **payment receipt** upload for manual confirmation.
4. Submit — investment enters workflow (e.g. sales → submitted → compliance → finance → active).

**Do:** Use distinct files per document slot; attach receipt for bank transfer.

**Do not:** Submit without required corporate pack for company investments.

### 6.2 Investment detail — operations

**Story:** As compliance/finance/sales, I process an investment to activation.

**Common tasks:**

- **Approve / reject / return** at your stage.
- Assign or confirm **CASA** for funding.
- **Compliance / finance** fields (interest, WHT, etc. where shown).
- **Indemnity** — capture signature or upload agreement.
- **Liquidation** requests — approve/reject with reason.
- **KYC tier vs amount** — submitted investments may warn if amount exceeds tier limit; resolve tier before approval.

**Agent commission:** Visible on attributed deals for sales/agent roles and Super Admin; hidden for unrelated officers.

---

## 7. Staff user stories — Other modules (brief)

### 7.1 Products

View active **loan and investment products** (rates, tenures, marketing copy alignment). Customer Experience does not see this menu item.

### 7.2 Promotions (Marketing / Super Admin)

Configure promotion/campaign content used on customer/mobile surfaces.

### 7.3 Push Notifications (Super Admin)

Create and schedule **mobile push** campaigns; immediate send or scheduled time (processed by backend cron when due).

### 7.4 Reports & BI Dashboard

Export CSV / view TAT and pipeline analytics — roles listed in section 2.

### 7.5 Settings

- **Change password** — all staff.
- **GL Wrapper** — finance/admin.
- **Agent commission tiers** — Super Admin.

### 7.6 Users (Super Admin)

Invite staff, bulk CSV invite (`full_name`, `email`), assign roles, revoke access.

### 7.7 Transfers (Super Admin)

Staff-initiated transfer UI tied to CBA — use only with operational procedure.

### 7.8 CBA Migration (Super Admin)

Dangerous environment operations — follow runbooks in ops doc, not ad hoc clicks.

### 7.9 MDA Payroll (`/payroll-upload`)

Separate large CSV upload for payroll processing — not subject to the 10 MB document rule.

---

## 8. Customer portal user stories

**Who:** End customers (role `customer`)  
**Entry:** `/login` → `/dashboard`

### 8.1 Registration and onboarding

**Story:** As a new customer, I register, verify contact, and complete onboarding/KYC.

1. **Register** (optional referral in URL).
2. **Verify** email/OTP as prompted.
3. **Onboarding** — BVN, personal details, bank, selfie/liveness where required by product policy.
4. Land on **Dashboard**.

**Do:** Use the same phone/email you will use for OTP and statements.

**Do not:** Share OTP or passcode with anyone claiming to be “NOLT support” on social media.

### 8.2 Dashboard and applications

- **Dashboard** — start loan or investment, see prompts (e.g. pending gift token).
- **Applications** — list and resume drafts.
- **Products** — browse available products.
- **Profile** — update personal/bank details; upload bank statement when corporate or name mismatch requires manual verification (10 MB limit on uploads).

### 8.3 Self-serve loan

**Story:** As a customer, I apply for a loan online.

1. Choose loan type/product.
2. Confirm identity (pre-filled if KYC complete).
3. Employment and affordability questions.
4. Upload documents (size limit enforced).
5. References, indemnity acceptance, submit.
6. Track status in **Applications** — email notifications may arrive at stage changes.

If previously **rejected**, you may see block until **cooldown** ends.

### 8.4 Self-serve investment

**Story:** As a customer, I invest in Rise/Vault/Surge (or top-up).

1. KYC / identity steps (including selfie rules).
2. Configure amount, tenure, rollover.
3. Pay online or upload **transfer receipt**.
4. **Verify payment** route when applicable.
5. Gift/joint flows: use **`/claim-gift`** or **`/joint-investment`** links from email — do not need staff console.

### 8.5 Calculator

Customer **calculator** for estimates — not a binding offer until application is approved.

---

## 9. End-to-end flow diagrams (narrative)

### 9.1 New customer → first loan (staff-assisted)

1. CX opens **Customers** → **New customer** → BVN advance (or basic + manual fields).
2. Complete Tier 1/3 → onboard → CBA account created → credentials sent.
3. Sales opens **Loans** → new application for that customer → eligibility check passes.
4. Upload docs → submit → CX → credit → audit → finance → disbursed.
5. Customer receives funds per CBA/disbursement outcome.

### 9.2 Customer self-serve investment

1. Customer registers and completes KYC on portal.
2. Starts investment flow → documents → payment.
3. Staff see investment in **Investment** queue → compliance → finance → **active** with CASA/TD on CBA.
4. Customer sees active investment in app/portal communications.

### 9.3 Fix customer name in NMS and bank

1. CX opens **Customer details** → Tier 1 edit → update preferred name/contact.
2. **Save** → NMS updates → **CreateAccountUpdate** to CBA if CASA exists.
3. Confirm message; if sync failed, retry or ops checks CBA logs.

---

## 10. Do’s and don’ts (summary)

### Do

- Use the **correct role** for each action; escalate to Super Admin for user/audit/CBA migration tasks.
- Respect **10 MB** upload limit and **distinct files** per document slot.
- Complete **required** rejection reasons and finance fields before approve.
- Use **BVN basic retry** when advance fails, then fill all missing fields manually.
- Read **eligibility banners** before starting loans.
- Wait for **CBA processing** overlays to finish during onboarding.

### Don’t

- Don’t bypass blacklist/cooldown by creating duplicate BVN/customer records.
- Don’t assume loan stage changes alone fix **reapply blocks**.
- Don’t use Finance **Override** unless the failure flag is set after a real disburse attempt.
- Don’t upload one file to multiple document fields in the same application.
- Don’t ignore **core banking sync failed** messages after customer save.
- Don’t share staff credentials or use customer accounts to access `/staff/*`.

---

## 11. FAQs (frontend behavior)

**Why don’t I see Customers?**  
Only **Super Admin** and **Customer Experience** have the Customers menu item.

**Why is Override missing on a finance loan?**  
The **Override** control appears only after a failed finance disbursement set the failure flag — not for loans never attempted or manually edited in the database.

**Customer saved but bank details unchanged?**  
Check for a **core banking sync** error on save; customer must have **CASA**; backend must be deployed with profile-save CBA sync. Tier is not updated via this sync.

**Upload failed with no modal?**  
Hard refresh; ensure file ≤ **10 MB**. Network or session expiry may also cause generic errors — re-login and retry.

**Why can’t marketing open Reports?**  
By design — marketing sidebar is limited.

**Who sees commission on investments?**  
Super Admin sees all; sales/agent see only **their** attributed investments.

**BVN advance vs basic?**  
Advance pre-fills more fields; basic only guarantees name, DOB, phone — you must enter the rest before onboarding.

---

## 12. Document maintenance

When product behavior changes (new stage, new limit, new menu rule):

1. Update this file with the **user-visible** story and limits.
2. Update **[../walkthrough.md](../walkthrough.md)** for backend/API/stage matrices.
3. Add a FAQ if support receives repeated questions.

*Last updated: September 2026 — includes 10 MB uploads, customer profile CBA sync on save, loan eligibility/blacklist UX, Prembly BVN basic retry on onboarding, push notifications, and agent commission visibility rules.*
