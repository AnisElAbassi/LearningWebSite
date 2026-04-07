import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMe } from '../../store/authSlice';
import { closeMobileSidebar } from '../../store/uiSlice';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import MobileDrawer from './MobileDrawer';

export default function Layout() {
  const dispatch = useDispatch();
  const { sidebarCollapsed, sidebarMobileOpen } = useSelector(state => state.ui);

  useEffect(() => {
    dispatch(fetchMe());
  }, [dispatch]);

  return (
    <div className="flex h-screen bg-pg-black overflow-hidden" id="app-root">
      {/* Desktop sidebar — hidden on mobile AND print */}
      <div className="hidden md:block no-print">
        <Sidebar />
      </div>

      {/* Mobile drawer overlay */}
      <MobileDrawer isOpen={sidebarMobileOpen} onClose={() => dispatch(closeMobileSidebar())}>
        <Sidebar mobile onNavigate={() => dispatch(closeMobileSidebar())} />
      </MobileDrawer>

      {/* Main content */}
      <div id="main-wrapper" className={`flex-1 flex flex-col transition-all duration-300 ml-0 ${sidebarCollapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        <div className="no-print">
          <TopBar />
        </div>
        <main className="flex-1 overflow-y-auto p-3 md:p-6" id="print-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
