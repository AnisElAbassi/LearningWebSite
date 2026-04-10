import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import PipelinePage from './pages/PipelinePage';
import CalendarPage from './pages/CalendarPage';
import EventDetailPage from './pages/EventDetailPage';
import ClientsPage from './pages/ClientsPage';
import ClientDetailPage from './pages/ClientDetailPage';
import ExperiencesPage from './pages/ExperiencesPage';
import HardwarePage from './pages/HardwarePage';
import HardwareDetailPage from './pages/HardwareDetailPage';
import DealsPage from './pages/DealsPage';
import DealDetailPage from './pages/DealDetailPage';
import MaintenancePage from './pages/MaintenancePage';
import FinancePage from './pages/FinancePage';
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
        {/* Workflow */}
        <Route index element={<PipelinePage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="events/:id" element={<EventDetailPage />} />
        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/:id" element={<DealDetailPage />} />

        {/* Setup / Catalog */}
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="experiences" element={<ExperiencesPage />} />
        <Route path="hardware" element={<HardwarePage />} />
        <Route path="hardware/:id" element={<HardwareDetailPage />} />
        <Route path="maintenance" element={<MaintenancePage />} />

        {/* Insights */}
        <Route path="finance" element={<FinancePage />} />
        <Route path="reports" element={<ReportsPage />} />

        {/* System */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="activity" element={<ActivityLogPage />} />

        {/* Redirects for old paths */}
        <Route path="events" element={<Navigate to="/" replace />} />
        <Route path="invoices" element={<Navigate to="/finance" replace />} />
        <Route path="invoices/:id" element={<Navigate to="/finance" replace />} />
        <Route path="assets/lifecycle" element={<Navigate to="/hardware?tab=lifecycle" replace />} />
        <Route path="reports/qr-labels" element={<Navigate to="/hardware?tab=qr" replace />} />
        <Route path="costs/*" element={<Navigate to="/finance" replace />} />
        <Route path="staff/*" element={<Navigate to="/settings?tab=team" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
