import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';

import ScrollToTop from './components/layout/ScrollToTop';
import WebsiteLayout from './components/layout/WebsiteLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Website pages
const HomePage = lazy(() => import('./pages/website/HomePage'));
const AboutPage = lazy(() => import('./pages/website/AboutPage'));
const ProductsPage = lazy(() => import('./pages/website/ProductsPage'));
const FAQPage = lazy(() => import('./pages/website/FAQPage'));
const ContactPage = lazy(() => import('./pages/website/ContactPage'));
const InquiryPage = lazy(() => import('./pages/website/InquiryPage'));

// Auth
const LoginPage = lazy(() => import('./pages/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('./pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/auth/ResetPasswordPage'));

// Dashboard (Phase 2)
const DashboardPage = lazy(() => import('./pages/dashboard/DashboardPage'));
const CustomersPage = lazy(() => import('./pages/customers/CustomersPage'));

// Quotations (Phase 2 — Sales & Underwriting)
const QuotationsPage = lazy(() => import('./pages/quotations/QuotationsPage'));
const QuotationFormPage = lazy(() => import('./pages/quotations/QuotationFormPage'));
const QuotationDetailPage = lazy(() => import('./pages/quotations/QuotationDetailPage'));

// Policies (Phase 2 — Sales & Underwriting)
const PolicyDetailPage = lazy(() => import('./pages/policies/PolicyDetailPage'));
const IssuePolicyPage = lazy(() => import('./pages/policies/IssuePolicyPage'));

// Underwriter Insurance Requests
const InsuranceRequestsPage = lazy(() => import('./pages/underwriter/InsuranceRequestsPage'));

// Invoices (Phase 2 — Accounting & Payments)
const InvoicesPage = lazy(() => import('./pages/invoices/InvoicesPage'));
const InvoiceFormPage = lazy(() => import('./pages/invoices/InvoiceFormPage'));
const InvoiceDetailPage = lazy(() => import('./pages/invoices/InvoiceDetailPage'));
const PolicyStatementsPage = lazy(() => import('./pages/accounting/PolicyStatementsPage'));
const ReviewCollectionPaymentPage = lazy(() => import('./pages/accounting/ReviewCollectionPaymentPage'));
const SummaryCommissionPage = lazy(() => import('./pages/accounting/SummaryCommissionPage'));

// Payments (Phase 2 — Accounting & Payments)
const PaymentsPage = lazy(() => import('./pages/payments/PaymentsPage'));
const PaymentFormPage = lazy(() => import('./pages/payments/PaymentFormPage'));

// Claims (Phase 2 — Claims & Renewals)
const ClaimsPage = lazy(() => import('./pages/claims/ClaimsPage'));
const ClaimFormPage = lazy(() => import('./pages/claims/ClaimFormPage'));
const ClaimDetailPage = lazy(() => import('./pages/claims/ClaimDetailPage'));
const ClaimNotificationsPage = lazy(() => import('./pages/claims/ClaimNotificationsPage'));
const CompletedRequirementsPage = lazy(() => import('./pages/claims/CompletedRequirementsPage'));

// Renewals (Phase 2 — Claims & Renewals)
const RenewalsPage = lazy(() => import('./pages/renewals/RenewalsPage'));

// Reports & Settings (Phase 2 — Reports, Notifications, Settings & Final Polish)
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/settings/SettingsPage'));
const AuditLogPage = lazy(() => import('./pages/settings/AuditLogPage'));
const SummaryPage = lazy(() => import('./pages/summary/SummaryPage'));
const CollectionPage = lazy(() => import('./pages/collection/CollectionPage'));
const CollectionLedgerPage = lazy(() => import('./pages/collection/CollectionLedgerPage'));

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-[#4A0E17]" />
      <p className="text-sm text-slate-500 font-medium">Loading page...</p>
    </div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000, // 30 seconds
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <ScrollToTop />
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Corporate Website Routes */}
              <Route path="/" element={<WebsiteLayout />}>
                <Route index element={<HomePage />} />
                <Route path="about" element={<AboutPage />} />
                <Route path="products" element={<ProductsPage />} />
                <Route path="faqs" element={<FAQPage />} />
                <Route path="contact" element={<ContactPage />} />
                <Route path="inquiry" element={<InquiryPage />} />
              </Route>

              {/* Agent & Staff Portal - Login */}
              <Route path="agentportal" element={<LoginPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />

              {/* Authenticated Dashboard Routes */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />

                {/* Customers */}
                <Route path="customers" element={<ProtectedRoute requiredPermission="customers.view" forbiddenRoles={['Claims Officer']}><CustomersPage /></ProtectedRoute>} />

                {/* Quotations */}
                <Route path="quotations" element={<ProtectedRoute forbiddenRoles={['Underwriter', 'Claims Officer']}><QuotationsPage /></ProtectedRoute>} />
                <Route path="quotations/new" element={<ProtectedRoute forbiddenRoles={['Underwriter', 'Claims Officer']}><QuotationFormPage /></ProtectedRoute>} />
                <Route path="quotations/:id" element={<ProtectedRoute forbiddenRoles={['Underwriter', 'Claims Officer']}><QuotationDetailPage /></ProtectedRoute>} />
                <Route path="quotations/:id/edit" element={<ProtectedRoute forbiddenRoles={['Underwriter', 'Claims Officer']}><QuotationFormPage /></ProtectedRoute>} />

                {/* Policies */}
                <Route path="policies/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><PolicyDetailPage /></ProtectedRoute>} />
                <Route path="policies/issue/:quotationId" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><IssuePolicyPage /></ProtectedRoute>} />

                {/* Underwriter Insurance Requests */}
                <Route path="insurance-requests" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><InsuranceRequestsPage /></ProtectedRoute>} />

                {/* Invoices */}
                <Route path="invoices" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer', 'Accounting Officer']}><InvoicesPage /></ProtectedRoute>} />
                <Route path="invoices/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer', 'Accounting Officer']}><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="invoices/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer', 'Accounting Officer']}><InvoiceDetailPage /></ProtectedRoute>} />
                <Route path="invoices/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer', 'Accounting Officer']}><InvoiceFormPage /></ProtectedRoute>} />
                <Route path="policy-statements" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer', 'Collection']}><PolicyStatementsPage /></ProtectedRoute>} />
                <Route path="review-collection-payment" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer', 'Collection']}><ReviewCollectionPaymentPage /></ProtectedRoute>} />
                <Route path="summary-commission" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer', 'Collection']}><SummaryCommissionPage /></ProtectedRoute>} />

                {/* Payments */}
                <Route path="payments" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><PaymentsPage /></ProtectedRoute>} />
                <Route path="payments/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><PaymentFormPage /></ProtectedRoute>} />

                {/* Claims */}
                <Route path="claims" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><ClaimsPage /></ProtectedRoute>} />
                <Route path="claims/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><ClaimFormPage /></ProtectedRoute>} />
                <Route path="claims/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><ClaimDetailPage /></ProtectedRoute>} />
                <Route path="claims/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><ClaimFormPage /></ProtectedRoute>} />

                {/* Claim Notifications */}
                <Route path="claim-notifications" element={<ProtectedRoute forbiddenRoles={['Collection']}><ClaimNotificationsPage /></ProtectedRoute>} />
                <Route path="completed-requirements" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Collection']}><CompletedRequirementsPage /></ProtectedRoute>} />

                {/* Renewals */}
                <Route path="renewals" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal', 'Claims Officer']}><RenewalsPage /></ProtectedRoute>} />

                {/* Reports */}
                <Route path="reports" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><ReportsPage /></ProtectedRoute>} />

                {/* Summary */}
                <Route path="summary" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><SummaryPage /></ProtectedRoute>} />

                {/* Settings */}
                <Route path="settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="audit-logs" element={<ProtectedRoute requiredPermission="users.view"><AuditLogPage /></ProtectedRoute>} />

                {/* Collection */}
                <Route path="collection" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><CollectionPage /></ProtectedRoute>} />
                <Route path="collection/ledger" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal', 'Claims Officer']}><CollectionLedgerPage /></ProtectedRoute>} />
              </Route>

              {/* Catch-all redirect to Home */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
