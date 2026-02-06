# Nolt LMS GUI (Admin/Staff Portal)

The frontend application for the Nolt Finance Loan Management System. This portal is used by staff members (Sales Officers, Credit Managers, Auditors, Finance) to process loan applications and manage users.

## Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router DOM (v7)
- **HTTP Client**: Axios
- **Icons**: Material Symbols (Google Fonts)

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd copy-of-nolt-lms-gui-
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory to configure the connection to the backend.

**Required Variables:**

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_BACKEND_URL` | URL of the running backend API | `http://localhost:5000` |

### 4. Running the Application

**Development Mode:**
Starts the Vite development server with Hot Module Replacement (HMR).

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

**Production Build:**

```bash
# Build the project
npm run build

# Preview the production build locally
npm run preview
```

## Key Features

- **Staff Dashboard**: Overview of pending tasks, loan queues, and recent activities.
- **Loan Details View**: Comprehensive view of a loan application, including:
    - **Stage Tracker**: Visual progress of the loan through the approvals pipeline.
    - **Key Info Card**: High-level financial summary (Requested vs Approved Amount).
    - **Document Viewer**: Access to uploaded proofs (ID, Address, etc.) and Signatures.
    - **Action Center**: Approve, Reject, or Return applications based on user role.
- **User Management**: Admin interface to view and manage customer/staff accounts.
- **Theme Support**: Fully responsive Light and Dark mode support.

## Project Structure

- `src/components/`: Reusable UI components (Layouts, Navigation, Cards).
- `src/pages/`: Main page views (Dashboard, LoanDetails, Login).
- `src/assets/`: Static assets (Images, Global CSS).
- `src/App.tsx`: Main application entry point and routing logic.
- `index.css`: Global styles and Tailwind directives.
