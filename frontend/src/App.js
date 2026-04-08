import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CalendarPage from './pages/CalendarPage';
import EventsPage from './pages/EventsPage';
import EventDetailPage from './pages/EventDetailPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ExperiencesPage from './pages/ExperiencesPage';
import HardwarePage from './pages/HardwarePage';
import HardwareDetailPage from './pages/HardwareDetailPage';
import DealsPage from './pages/DealsPage';
import DealDetailPage from './pages/DealDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import FinancePage from './pages/FinancePage';
import MaintenancePage from './pages/MaintenancePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import ActivityLogPage from './pages/ActivityLogPage';

function ProtectedRoute({ children }) {
  const { token } = useSelector(state => state.auth);
  return token ? children : <Navigate to="/login" />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        {/* Operations */}
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />

        {/* Business */}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealDetailPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />

        {/* Assets */}
        <Route path="hardware" element={<HardwarePage />} />
        <Route path="hardware/:id" element={<HardwareDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />

        {/* Insights */}
        <Route path="finance" element={<FinancePage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* System */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity" element={<ActivityLogPage />} />

        {/* Redirects for old paths — keeps bookmarks working */}
        <Route path="assets/lifecycle" element={<Navigate to="/hardware?tab=lifecycle" replace />} />
        <Route path="reports/qr-labels" element={<Navigate to="/hardware?tab=qr" replace />} />
        <Route path="costs/events" element={<Navigate to="/finance?tab=events" replace />} />
        <Route path="costs/logistics" element={<Navigate to="/finance?tab=logistics" replace />} />
        <Route path="costs/margins" element={<Navigate to="/reports?tab=profitability" replace />} />
        <Route path="reports/monthly" element={<Navigate to="/reports" replace />} />
        <Route path="staff" element={<Navigate to="/settings?tab=team" replace />} />
        <Route path="staff/availability" element={<Navigate to="/settings?tab=team" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
