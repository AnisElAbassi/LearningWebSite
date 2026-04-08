import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMe } from '../../store/authSlice';
import { closeMobileSidebar } from '../../store/uiSlice';
import { useI18n } from '../../hooks/useI18n';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileDrawer from './MobileDrawer';

export default function Layout() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector(state => state.ui);
  const { isRTL } = useI18n();

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  // RTL-aware margin: ms = margin-inline-start
  const marginClass = sidebarCollapsed ? 'md:ms-20' : 'md:ms-64';

  return (
    <div className="flex h-screen bg-pg-black overflow-hidden" id="app-root">
      {/* Desktop sidebar — hidden on mobile AND print */}
      <div className={`hidden md:block no-print ${isRTL ? 'order-last' : ''}`}>
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      <MobileDrawer isOpen={sidebarMobileOpen} onClose={() => dispatch(closeMobileSidebar())}>
        <Sidebar mobile onNavigate={() => dispatch(closeMobileSidebar())} />
      </MobileDrawer>

      {/* Main content */}
      <div id="main-wrapper" className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${marginClass}`}>
        <div className="no-print flex-shrink-0">
          <TopBar />
        </div>
        <main className="flex-1 overflow-auto min-h-0 p-3 md:p-6" id="print-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
