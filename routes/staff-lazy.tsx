import { lazy } from 'react';

/** Staff portal pages — separate async chunks (NMS VAPT F-003). */
export const StaffDashboard = lazy(() => import('../pages/StaffDashboard'));
export const LoanQueuePage = lazy(() => import('../pages/LoanQueuePage'));
export const StaffTransfersPage = lazy(() => import('../pages/StaffTransfersPage'));
export const StaffInvestmentsPage = lazy(() => import('../pages/StaffInvestmentsPage'));
export const StaffInvestmentDetailsPage = lazy(() => import('../pages/StaffInvestmentDetailsPage'));
export const StaffPromotionsPage = lazy(() => import('../pages/StaffPromotionsPage'));
export const StaffMobileNotificationsPage = lazy(() => import('../pages/StaffMobileNotificationsPage'));
export const StaffInvestmentCalendarPage = lazy(() => import('../pages/StaffInvestmentCalendarPage'));
export const ProductsPage = lazy(() => import('../pages/ProductsPage'));
export const LoanDetailsPage = lazy(() => import('../pages/LoanDetailsPage'));
export const ReportsPage = lazy(() => import('../pages/ReportsPage'));
export const SettingsPage = lazy(() => import('../pages/SettingsPage'));
export const UsersPage = lazy(() => import('../pages/UsersPage'));
export const CustomersPage = lazy(() => import('../pages/CustomersPage'));
export const CustomerDetailsPage = lazy(() => import('../pages/CustomerDetailsPage'));
export const AuditTrailPage = lazy(() => import('../pages/AuditTrailPage'));
export const TimelineReportPage = lazy(() => import('../pages/TimelineReportPage'));
export const StaffCalculatorPage = lazy(() => import('../pages/StaffCalculatorPage'));
export const CbaMigrationPage = lazy(() => import('../pages/CbaMigrationPage'));
export const PayrollUploadPage = lazy(() => import('../pages/PayrollUploadPage'));
export const DemographyReportPage = lazy(() => import('../pages/DemographyReportPage'));
