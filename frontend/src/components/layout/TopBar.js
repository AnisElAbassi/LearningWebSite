import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../store/authSlice';
import { setNotifications, toggleMobileSidebar } from '../../store/uiSlice';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineBell, HiOutlineLogout, HiOutlineUser, HiOutlineSearch, HiOutlineMenu } from 'react-icons/hi';
import api from '../../utils/api';
import { useI18n } from '../../hooks/useI18n';

export default function TopBar() {
  const { locale, setLocale, t, LANGUAGES } = useI18n();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth);
  const { unreadCount, notifications } = useSelector(state => state.ui);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [search, setSearch] = useState('');
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get('/notifications');
        dispatch(setNotifications(data));
      } catch (err) { /* silent */ }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleClick = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    const { data } = await api.get('/notifications');
    dispatch(setNotifications(data));
  };

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    const { data } = await api.get('/notifications');
    dispatch(setNotifications(data));
  };

  return (
    <header className="h-14 md:h-16 bg-pg-dark/80 backdrop-blur-xl border-b border-pg-border flex items-center justify-between px-3 md:px-6 sticky top-0 z-30">
      {/* Left: Hamburger (mobile) + Search */}
      <div className="flex items-center gap-2 flex-1">
        {/* Hamburger — mobile only */}
        <button
          onClick={() => dispatch(toggleMobileSidebar())}
          className="p-2 text-gray-400 hover:text-pg-purple transition-colors md:hidden"
        >
          <HiOutlineMenu className="w-6 h-6" />
        </button>

        {/* Search — full on desktop, icon toggle on mobile */}
        <div className="hidden md:block relative flex-1 max-w-md">
          <HiOutlineSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t('search_placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-pg-black/50 border border-pg-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pg-purple/30 transition-colors"
          />
        </div>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="p-2 text-gray-400 hover:text-pg-purple transition-colors md:hidden"
        >
          <HiOutlineSearch className="w-5 h-5" />
        </button>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Language Switcher */}
        <div className="hidden sm:flex items-center bg-pg-black/30 rounded-lg border border-pg-border overflow-hidden">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => setLocale(lang.code)}
              className={`px-2 py-1.5 text-[10px] md:text-xs font-medium transition-all ${
                locale === lang.code ? 'bg-pg-purple/20 text-pg-purple' : 'text-gray-500 hover:text-gray-300'
              }`}
              title={lang.label}
            >
              {lang.code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 text-gray-400 hover:text-pg-purple transition-colors"
          >
            <HiOutlineBell className="w-5 h-5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-pg-yellow rounded-full flex items-center justify-center text-[10px] font-bold text-black"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {showNotifs && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-72 md:w-80 glass-card rounded-xl shadow-glass overflow-hidden"
              >
                <div className="flex items-center justify-between p-3 border-b border-pg-border">
                  <h3 className="font-inter font-semibold text-sm">{t('notifications')}</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-pg-purple hover:underline">{t('mark_all_read')}</button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">{t('no_notifications')}</p>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { markRead(n.id); if (n.actionUrl) navigate(n.actionUrl); setShowNotifs(false); }}
                        className={`p-3 border-b border-pg-border/50 cursor-pointer hover:bg-pg-dark2/50 transition-colors ${!n.read ? 'bg-pg-purple/5' : ''}`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-gray-600 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2 p-1 rounded-lg hover:bg-pg-dark2 transition-colors"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-pg-gradient">
              <span className="text-xs font-bold text-black">{user?.name?.[0] || 'U'}</span>
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-white leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-500">{user?.role?.label}</p>
            </div>
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 top-12 w-48 glass-card rounded-xl shadow-glass overflow-hidden"
              >
                <button
                  onClick={() => { navigate('/staff'); setShowProfile(false); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-pg-dark2 hover:text-white transition-colors"
                >
                  <HiOutlineUser className="w-4 h-4" /> {t('profile')}
                </button>
                {/* Mobile language switcher */}
                <div className="sm:hidden flex items-center border-t border-pg-border">
                  {LANGUAGES.map(lang => (
                    <button key={lang.code} onClick={() => setLocale(lang.code)}
                      className={`flex-1 py-2 text-xs font-medium ${locale === lang.code ? 'text-pg-purple bg-pg-purple/10' : 'text-gray-500'}`}>
                      {lang.code.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => { dispatch(logout()); navigate('/login'); }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-neon-red hover:bg-pg-dark2 transition-colors border-t border-pg-border"
                >
                  <HiOutlineLogout className="w-4 h-4" /> {t('logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile search overlay */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute left-0 right-0 top-14 p-3 bg-pg-dark border-b border-pg-border md:hidden z-20"
          >
            <input
              type="text"
              placeholder={t('search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-4 py-2 bg-pg-black border border-pg-border rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none focus:border-pg-purple/30"
              autoFocus
            />
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
