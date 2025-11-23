import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { usePlatformAdminStore } from './store/platformAdminStore';
import { useTenant } from './context/TenantContext';
import UnifiedLogin from './pages/UnifiedLogin';
import DashboardPage from './components/dashboard/DashboardPage';
import CustomerListPage from './components/customers/CustomerListPage';
import DriverListPage from './components/drivers/DriverListPage';
import SchedulePage from './components/schedules/SchedulePage';
import VehicleListPage from './components/vehicles/VehicleListPage';
import SocialOutingsPage from './components/social-outings/SocialOutingsPage';
import ProvidersPage from './components/providers/ProvidersPage';
import FuelCardsPage from './components/fuel-cards/FuelCardsPage';
import HolidaysPage from './components/holidays/HolidaysPage';
import { InvoicesPage } from './components/invoices/InvoicesPage';
import PermitsPage from './components/permits/PermitsPage';
import TrainingPage from './components/training/TrainingPage';
import SafeguardingPage from './components/safeguarding/SafeguardingPage';
import DriverMessagesPage from './pages/DriverMessagesPage';
import CustomerMessagesPage from './pages/CustomerMessagesPage';
import DriverDashboardAdminPage from './pages/DriverDashboardAdminPage';
import CustomerDashboardAdminPage from './pages/CustomerDashboardAdminPage';
import PayrollPage from './components/payroll/PayrollPage';
import AdminDashboard from './components/admin/AdminDashboard';
import FeedbackPage from './components/admin/FeedbackPage';
import SettingsPage from './components/admin/SettingsPage';
import { DocumentsPage } from './components/documents/DocumentsPage';
import Layout from './components/layout/Layout';
import PlatformAdminLogin from './components/platform-admin/PlatformAdminLogin';
import TenantListPage from './components/platform-admin/TenantListPage';
import DriverDashboard from './pages/DriverDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import ComplianceAlertsPage from './components/compliance/ComplianceAlertsPage';
import ServiceRegistrationsPage from './components/compliance/ServiceRegistrationsPage';
import FinancialSurplusPage from './components/compliance/FinancialSurplusPage';
import PassengerClassPage from './components/compliance/PassengerClassPage';
import { ServiceProvider } from './contexts/ServiceContext';
import BusDashboard from './components/bus/BusDashboard';
import BusRoutesPage from './components/bus/BusRoutesPage';
import BusTimetablesPage from './components/bus/BusTimetablesPage';
import BusBookingsPage from './components/bus/BusBookingsPage';
// Section22CompliancePage now integrated into PermitsPage as a tab
import SeatAssignmentPage from './components/bus/SeatAssignmentPage';
import RegularPassengersPage from './components/bus/RegularPassengersPage';
import BusCustomersPage from './components/bus/BusCustomersPage';
// TodaysOperationsPage removed - merged into BusDashboard
// BusCommunicationsPage removed - using universal CustomerMessagesPage instead
import BusAnalyticsPage from './components/bus/BusAnalyticsPage';
// SurplusPoolDashboard, CooperativeMembersPage, DividendManagementPage now integrated into CooperativePage as tabs
import QuickBookPage from './components/bus/QuickBookPage';
import CooperativePage from './components/bus/CooperativePage';
import CustomerRouteProposalsPage from './pages/CustomerRouteProposalsPage';
import RouteProposalsAdmin from './pages/admin/RouteProposalsAdmin';
import RouteOptimizationAnalytics from './components/analytics/RouteOptimizationAnalytics';
import RosterOptimizationDashboard from './components/roster/RosterOptimizationDashboard';
import UnifiedRosterPage from './components/roster/UnifiedRosterPage';

/**
 * Main Application Component - Multi-Tenant
 *
 * Handles routing for both:
 * - Platform admin (root domain)
 * - Tenant applications (subdomains)
 */

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const isPlatformAdminAuthenticated = usePlatformAdminStore((state) => state.isAuthenticated);
  const { isPlatformAdmin, loading, error } = useTenant();

  // Loading tenant information
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '1rem',
      }}>
        <div className="spinner" style={{ width: '3rem', height: '3rem' }}></div>
        <p style={{ color: 'var(--gray-600)' }}>Loading application...</p>
      </div>
    );
  }

  // Tenant not found error
  if (!isPlatformAdmin && error) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '2rem',
      }}>
        <div className="card" style={{ maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>⚠️</div>
          <h2 style={{ marginBottom: '1rem' }}>Tenant Not Found</h2>
          <p style={{ color: 'var(--gray-600)', marginBottom: '1rem' }}>
            {error}
          </p>
          <p style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
            Please check the subdomain and try again, or contact support.
          </p>
        </div>
      </div>
    );
  }

  // Platform Admin Routes
  if (isPlatformAdmin) {
    return (
      <Routes>
        <Route path="/platform-admin">
          <Route
            path="login"
            element={isPlatformAdminAuthenticated ? <Navigate to="/platform-admin/dashboard" replace /> : <PlatformAdminLogin />}
          />
          <Route
            path="dashboard"
            element={isPlatformAdminAuthenticated ? <TenantListPage /> : <Navigate to="/platform-admin/login" replace />}
          />
          <Route
            index
            element={<Navigate to="/platform-admin/dashboard" replace />}
          />
        </Route>
        <Route
          path="*"
          element={<Navigate to="/platform-admin/dashboard" replace />}
        />
      </Routes>
    );
  }

  // Determine redirect path based on user role
  const getDefaultRoute = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'driver':
        return '/driver/dashboard';
      case 'customer':
        return '/customer/dashboard';
      default:
        return '/dashboard';
    }
  };

  // Tenant Application Routes
  return (
    <ServiceProvider transportEnabled={true} busEnabled={true}>
      <Routes>
      {/* Unified Login - Routes to appropriate dashboard based on role */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to={getDefaultRoute()} replace /> : <UnifiedLogin />}
      />

      {/* Driver Dashboard */}
      <Route path="/driver/dashboard" element={<DriverDashboard />} />

      {/* Customer Dashboard */}
      <Route path="/customer/dashboard" element={<CustomerDashboard />} />
      <Route path="/customer/route-proposals" element={<CustomerRouteProposalsPage />} />

      {/* Protected Tenant Routes */}
      <Route
        path="/"
        element={isAuthenticated ? <Layout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="customers" element={<CustomerListPage />} />
        <Route path="drivers" element={<DriverListPage />} />
        <Route path="schedules" element={<SchedulePage />} />
        <Route path="vehicles" element={<VehicleListPage />} />
        <Route path="social-outings" element={<SocialOutingsPage />} />
        <Route path="providers" element={<ProvidersPage />} />
        <Route path="fuel-cards" element={<FuelCardsPage />} />
        <Route path="holidays" element={<HolidaysPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="permits" element={<PermitsPage />} />
        <Route path="training" element={<TrainingPage />} />
        <Route path="safeguarding" element={<SafeguardingPage />} />
        <Route path="documents" element={<DocumentsPage />} />

        {/* Operations & Optimization */}
        <Route path="operations/route-optimization" element={<RouteOptimizationAnalytics />} />
        <Route path="operations/roster-optimization" element={<RosterOptimizationDashboard />} />

        {/* Unified Driver Roster - adapts based on active services */}
        <Route path="roster" element={<UnifiedRosterPage />} />

        {/* Compliance Routes */}
        <Route path="compliance/alerts" element={<ComplianceAlertsPage />} />
        <Route path="compliance/service-registrations" element={<ServiceRegistrationsPage />} />
        <Route path="compliance/financial-surplus" element={<FinancialSurplusPage />} />
        <Route path="compliance/passenger-classes" element={<PassengerClassPage />} />

        {/* Bus Service Routes - bus-specific modules only */}
        <Route path="bus/customers" element={<BusCustomersPage />} />
        <Route path="bus/cooperative" element={<CooperativePage />} />
        <Route path="bus/routes" element={<BusRoutesPage />} />
        <Route path="bus/timetables" element={<BusTimetablesPage />} />
        <Route path="bus/roster" element={<Navigate to="/roster" replace />} />
        <Route path="bus/book" element={<QuickBookPage />} />
        <Route path="bus/bookings" element={<BusBookingsPage />} />
        <Route path="bus/seats" element={<SeatAssignmentPage />} />
        <Route path="bus/regular-passengers" element={<RegularPassengersPage />} />
        <Route path="bus/communications" element={<CustomerMessagesPage />} />
        <Route path="bus/analytics" element={<BusAnalyticsPage />} />
        {/* surplus-pool, members, dividends routes removed - now tabs in CooperativePage */}
        {/* bus/compliance route removed - now tab in PermitsPage */}

        {/* Note: /dashboard is now service-aware and shows bus or transport based on activeService */}

        {/* Route Proposals (Admin) */}
        <Route path="admin/route-proposals" element={<RouteProposalsAdmin />} />

        <Route path="driver-messages" element={<DriverMessagesPage />} />
        <Route path="customer-messages" element={<CustomerMessagesPage />} />
        <Route path="feedback" element={<FeedbackPage />} />
        <Route path="driver-dashboard-admin" element={<DriverDashboardAdminPage />} />
        <Route path="customer-dashboard-admin" element={<CustomerDashboardAdminPage />} />
        <Route path="admin" element={<AdminDashboard />} />
        <Route path="admin/settings" element={<SettingsPage />} />
        {/* More routes will be added in future stages */}
      </Route>

      {/* 404 */}
      <Route path="*" element={<div className="card" style={{ margin: '2rem' }}>404 - Page Not Found</div>} />
      </Routes>
    </ServiceProvider>
  );
}

export default App;
