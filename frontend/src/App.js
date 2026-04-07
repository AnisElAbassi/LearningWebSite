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
import AssetLifecyclePage from './pages/AssetLifecyclePage';
import UsersPage from './pages/UsersPage';
import StaffAvailabilityPage from './pages/StaffAvailabilityPage';
import MaintenancePage from './pages/MaintenancePage';
import EventCostsPage from './pages/EventCostsPage';
import LogisticsCostsPage from './pages/LogisticsCostsPage';
import MarginAnalysisPage from './pages/MarginAnalysisPage';
import MonthlyReportPage from './pages/MonthlyReportPage';
import ReportsPage from './pages/ReportsPage';
import QRLabelsPage from './pages/QRLabelsPage';
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
        {/* Event Management */}
        <Route index element={<DashboardPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="events" element={<EventsPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />

        {/* Clients & CRM */}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />

        {/* Finance */}
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealDetailPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="finance" element={<FinancePage />} />

        {/* Assets & Storage */}
        <Route path="hardware" element={<HardwarePage />} />
        <Route path="hardware/:id" element={<HardwareDetailPage />} />
        <Route path="assets/lifecycle" element={<AssetLifecyclePage />} />
        <Route path="maintenance" element={<MaintenancePage />} />

        {/* People */}
        <Route path="staff" element={<UsersPage />} />
        <Route path="staff/availability" element={<StaffAvailabilityPage />} />

        {/* Cost Tracking */}
        <Route path="costs/events" element={<EventCostsPage />} />
        <Route path="costs/logistics" element={<LogisticsCostsPage />} />
        <Route path="costs/margins" element={<MarginAnalysisPage />} />

        {/* Reports */}
        <Route path="reports" element={<ReportsPage />} />
        <Route path="reports/monthly" element={<MonthlyReportPage />} />
        <Route path="reports/qr-labels" element={<QRLabelsPage />} />

        {/* System */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity" element={<ActivityLogPage />} />
      </Route>
    </Routes>
  );
}

export default App;
