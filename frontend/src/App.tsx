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

// Dashboard (Phase 2)
import DashboardPage from './pages/dashboard/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';

// Quotations (Phase 2 — Sales & Underwriting)
import QuotationsPage from './pages/quotations/QuotationsPage';
import QuotationFormPage from './pages/quotations/QuotationFormPage';
import QuotationDetailPage from './pages/quotations/QuotationDetailPage';

// Policies (Phase 2 — Sales & Underwriting)
import PoliciesPage from './pages/policies/PoliciesPage';
import PolicyDetailPage from './pages/policies/PolicyDetailPage';
import IssuePolicyPage from './pages/policies/IssuePolicyPage';

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
              <Route path="customers" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><CustomersPage /></ProtectedRoute>} />

              {/* Quotations */}
              <Route path="quotations" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationsPage /></ProtectedRoute>} />
              <Route path="quotations/new" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationFormPage /></ProtectedRoute>} />
              <Route path="quotations/:id" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationDetailPage /></ProtectedRoute>} />
              <Route path="quotations/:id/edit" element={<ProtectedRoute forbiddenRoles={['Underwriter']}><QuotationFormPage /></ProtectedRoute>} />

              {/* Policies */}
              <Route path="policies" element={<ProtectedRoute forbiddenRoles={['Sales Agent']}><PoliciesPage /></ProtectedRoute>} />
              <Route path="policies/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent']}><PolicyDetailPage /></ProtectedRoute>} />
              <Route path="policies/issue/:quotationId" element={<ProtectedRoute forbiddenRoles={['Sales Agent']}><IssuePolicyPage /></ProtectedRoute>} />

              {/* Invoices */}
              <Route path="invoices" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><InvoicesPage /></ProtectedRoute>} />
              <Route path="invoices/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><InvoiceFormPage /></ProtectedRoute>} />
              <Route path="invoices/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><InvoiceDetailPage /></ProtectedRoute>} />
              <Route path="invoices/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><InvoiceFormPage /></ProtectedRoute>} />

              {/* Payments */}
              <Route path="payments" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><PaymentsPage /></ProtectedRoute>} />
              <Route path="payments/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><PaymentFormPage /></ProtectedRoute>} />

              {/* Claims */}
              <Route path="claims" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><ClaimsPage /></ProtectedRoute>} />
              <Route path="claims/new" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><ClaimFormPage /></ProtectedRoute>} />
              <Route path="claims/:id" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><ClaimDetailPage /></ProtectedRoute>} />
              <Route path="claims/:id/edit" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><ClaimFormPage /></ProtectedRoute>} />

              {/* Renewals */}
              <Route path="renewals" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><RenewalsPage /></ProtectedRoute>} />

              {/* Reports */}
              <Route path="reports" element={<ProtectedRoute forbiddenRoles={['Sales Agent', 'Underwriter']}><ReportsPage /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="settings" element={<ProtectedRoute requiredPermission="settings.view"><SettingsPage /></ProtectedRoute>} />
            </Route>

            {/* Catch-all redirect to Home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}
