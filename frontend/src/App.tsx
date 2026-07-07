import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';

import ScrollToTop from './components/layout/ScrollToTop';
import WebsiteLayout from './components/layout/WebsiteLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Website pages
import HomePage from './pages/website/HomePage';
import AboutPage from './pages/website/AboutPage';
import ProductsPage from './pages/website/ProductsPage';
import FAQPage from './pages/website/FAQPage';
import ContactPage from './pages/website/ContactPage';
import InquiryPage from './pages/website/InquiryPage';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';

// Dashboard (Phase 2)
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';

// Quotations (Phase 2 — Sales & Underwriting)
import QuotationsPage from './pages/quotations/QuotationsPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import QuotationDetailPage from './pages/quotations/QuotationDetailPage';

// Policies (Phase 2 — Sales & Underwriting)
import PolicyDetailPage from './pages/policies/PolicyDetailPage';
import IssuePolicyPage from './pages/policies/IssuePolicyPage';

// Underwriter Insurance Requests
import InsuranceRequestsPage from './pages/underwriter/InsuranceRequestsPage';

// Invoices (Phase 2 — Accounting & Payments)
import InvoicesPage from './pages/invoices/InvoicesPage';
import InvoiceFormPage from './pages/invoices/InvoiceFormPage';
import InvoiceDetailPage from './pages/invoices/InvoiceDetailPage';

// Payments (Phase 2 — Accounting & Payments)
import PaymentsPage from './pages/payments/PaymentsPage';
import PaymentFormPage from './pages/payments/PaymentFormPage';

// Claims (Phase 2 — Claims & Renewals)
import ClaimsPage from './pages/claims/ClaimsPage';
import ClaimFormPage from './pages/claims/ClaimFormPage';
import ClaimDetailPage from './pages/claims/ClaimDetailPage';

// Renewals (Phase 2 — Claims & Renewals)
import RenewalsPage from './pages/renewals/RenewalsPage';

// Reports & Settings (Phase 2 — Reports, Notifications, Settings & Final Polish)
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import SummaryPage from './pages/summary/SummaryPage';

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
              <Route path="customers" element={<ProtectedRoute requiredPermission="customers.view"><CustomersPage /></ProtectedRoute>} />

              {/* Quotations */}
              <Route path="quotations" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationsPage /></ProtectedRoute>} />
              <Route path="quotations/new" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationFormPage /></ProtectedRoute>} />
              <Route path="quotations/:id" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationDetailPage /></ProtectedRoute>} />
              <Route path="quotations/:id/edit" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationFormPage /></ProtectedRoute>} />

              {/* Policies */}
              <Route path="policies/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal']}><PolicyDetailPage /></ProtectedRoute>} />
              <Route path="policies/issue/:quotationId" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal']}><IssuePolicyPage /></ProtectedRoute>} />

              {/* Underwriter Insurance Requests */}
              <Route path="insurance-requests" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal']}><InsuranceRequestsPage /></ProtectedRoute>} />

              {/* Invoices */}
              <Route path="invoices" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><InvoicesPage /></ProtectedRoute>} />
              <Route path="invoices/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><InvoiceFormPage /></ProtectedRoute>} />
              <Route path="invoices/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><InvoiceDetailPage /></ProtectedRoute>} />
              <Route path="invoices/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><InvoiceFormPage /></ProtectedRoute>} />

              {/* Payments */}
              <Route path="payments" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><PaymentsPage /></ProtectedRoute>} />
              <Route path="payments/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><PaymentFormPage /></ProtectedRoute>} />

              {/* Claims */}
              <Route path="claims" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><ClaimsPage /></ProtectedRoute>} />
              <Route path="claims/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><ClaimFormPage /></ProtectedRoute>} />
              <Route path="claims/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><ClaimDetailPage /></ProtectedRoute>} />
              <Route path="claims/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><ClaimFormPage /></ProtectedRoute>} />

              {/* Renewals */}
              <Route path="renewals" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter', 'Team Renewal']}><RenewalsPage /></ProtectedRoute>} />

              {/* Reports */}
              <Route path="reports" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal']}><ReportsPage /></ProtectedRoute>} />

              {/* Summary */}
              <Route path="summary" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Team Renewal']}><SummaryPage /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="settings" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Accounting Officer', 'Claims Officer', 'Team Renewal']}><SettingsPage /></ProtectedRoute>} />
            </Route>

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
