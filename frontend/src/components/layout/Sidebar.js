import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toggleSidebar } from '../../store/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineHome, HiOutlineCalendar, HiOutlineClipboardList, HiOutlineUserGroup,
  HiOutlineCube, HiOutlineDesktopComputer, HiOutlineCurrencyDollar, HiOutlineCog,
  HiOutlineChartBar, HiOutlineUsers, HiOutlineDocumentText,
  HiOutlineChevronLeft, HiOutlineChevronRight, HiOutlineAdjustments,
  HiOutlineTruck, HiOutlineTrendingUp,
  HiOutlineRefresh, HiOutlineClipboardCheck, HiOutlineDocumentDuplicate
} from 'react-icons/hi';
import { useI18n } from '../../hooks/useI18n';

const navSections = [
  {
    // Daily operations — what you check every day
    id: 'operations', label: 'nav_operations', items: [
      { path: '/', icon: HiOutlineHome, label: 'dashboard', exact: true },
      { path: '/calendar', icon: HiOutlineCalendar, label: 'calendar' },
      { path: '/events', icon: HiOutlineClipboardList, label: 'events' },
    ]
  },
  {
    // Client relationship — who you work with
    id: 'crm', label: 'nav_clients', items: [
      { path: '/clients', icon: HiOutlineUserGroup, label: 'clients' },
      { path: '/deals', icon: HiOutlineCurrencyDollar, label: 'deals' },
    ]
  },
  {
    // What you offer
    id: 'catalog', label: 'nav_catalog', items: [
      { path: '/experiences', icon: HiOutlineDesktopComputer, label: 'experiences' },
      { path: '/staff', icon: HiOutlineUsers, label: 'staff_roles' },
    ]
  },
  {
    // Physical items you own
    id: 'assets', label: 'nav_assets', items: [
      { path: '/hardware', icon: HiOutlineCube, label: 'hardware' },
      { path: '/assets/lifecycle', icon: HiOutlineRefresh, label: 'asset_lifecycle' },
      { path: '/reports/qr-labels', icon: HiOutlineCube, label: 'qr_labels' },
      { path: '/maintenance', icon: HiOutlineAdjustments, label: 'maintenance' },
    ]
  },
  {
    // Money in and out
    id: 'finance', label: 'nav_finance', items: [
      { path: '/invoices', icon: HiOutlineDocumentDuplicate, label: 'invoices' },
      { path: '/costs/events', icon: HiOutlineCurrencyDollar, label: 'event_costs' },
      { path: '/costs/logistics', icon: HiOutlineTruck, label: 'logistics_costs' },
      { path: '/costs/margins', icon: HiOutlineTrendingUp, label: 'margin_analysis' },
    ]
  },
  {
    // Big picture
    id: 'reports', label: 'nav_reports', items: [
      { path: '/reports', icon: HiOutlineChartBar, label: 'reports' },
      { path: '/finance', icon: HiOutlineChartBar, label: 'revenue_pnl' },
    ]
  },
  {
    // System config
    id: 'settings', label: 'nav_system', items: [
      { path: '/settings', icon: HiOutlineCog, label: 'settings' },
      { path: '/activity', icon: HiOutlineDocumentText, label: 'activity_log' },
    ]
  },
];

export default function Sidebar({ mobile, onNavigate }) {
  const dispatch = useDispatch();
  const location = useLocation();
  const { sidebarCollapsed } = useSelector(state => state.ui);
  const { t } = useI18n();
  const collapsed = mobile ? false : sidebarCollapsed;

  const handleNavClick = () => {
    if (onNavigate) onNavigate();
  };

  return (
    <motion.aside
      animate={{ width: mobile ? 280 : collapsed ? 80 : 256 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-full bg-pg-dark border-r border-pg-border flex flex-col"
      style={mobile ? {} : { position: 'fixed', left: 0, top: 0, zIndex: 40 }}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-pg-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-pg-gradient">
            <span className="font-inter font-black text-black text-lg">P</span>
          </div>
          <AnimatePresence>
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="overflow-hidden">
                <h1 className="font-inter font-black text-lg pg-text-gradient whitespace-nowrap">PixelGate</h1>
                <p className="text-[10px] text-gray-500 tracking-wider whitespace-nowrap">OPERATIONS DASHBOARD</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navSections.map((section, sectionIdx) => {
          return (
            <div key={section.id}>
              {/* Small divider between sections — not on the first one */}
              {sectionIdx > 0 && !collapsed && (
                <div className="mt-3 mb-2 px-3">
                  <div className="h-px bg-pg-border" />
                </div>
              )}
              {sectionIdx > 0 && collapsed && (
                <div className="h-px bg-pg-border mx-2 my-2" />
              )}

              {section.items.map(item => {
                      const isActive = item.exact
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

                      return (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={handleNavClick}
                          className={`relative flex items-center h-9 rounded-lg mb-0.5 transition-all duration-200 group overflow-hidden ${
                            isActive
                              ? 'bg-pg-purple/10 text-pg-purple'
                              : 'text-gray-400 hover:bg-pg-dark2 hover:text-white'
                          } ${collapsed ? 'justify-center px-0' : 'px-3'}`}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="activeTab"
                              className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full"
                              style={{ background: 'linear-gradient(180deg, #a855f7, #fbbf24)' }}
                              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            />
                          )}
                          <div className={`flex items-center justify-center ${collapsed ? '' : 'w-5 mr-3'}`}>
                            <item.icon className="w-[18px] h-[18px]" />
                          </div>
                          {!collapsed && (
                            <span className="text-[13px] font-medium whitespace-nowrap leading-none">{t(item.label)}</span>
                          )}
                          {collapsed && (
                            <div className="absolute left-full ml-2 px-2 py-1 bg-pg-card border border-pg-border rounded text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                              {t(item.label)}
                            </div>
                          )}
                        </NavLink>
                      );
                    })}
            </div>
          );
        })}
      </nav>

      {/* Collapse Toggle — desktop only */}
      {!mobile && (
        <button
          onClick={() => dispatch(toggleSidebar())}
          className="h-12 flex items-center justify-center border-t border-pg-border text-gray-500 hover:text-pg-purple transition-colors flex-shrink-0"
        >
          {collapsed ? <HiOutlineChevronRight className="w-5 h-5" /> : <HiOutlineChevronLeft className="w-5 h-5" />}
        </button>
      )}
    </motion.aside>
  );
}
