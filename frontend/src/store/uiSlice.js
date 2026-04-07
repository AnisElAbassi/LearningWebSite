import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarCollapsed: false,
    sidebarMobileOpen: false,
    notifications: [],
    unreadCount: 0,
  },
  reducers: {
    toggleSidebar: (state) => { state.sidebarCollapsed = !state.sidebarCollapsed; },
    toggleMobileSidebar: (state) => { state.sidebarMobileOpen = !state.sidebarMobileOpen; },
    closeMobileSidebar: (state) => { state.sidebarMobileOpen = false; },
    setNotifications: (state, action) => {
      state.notifications = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    },
  },
});

export const { toggleSidebar, toggleMobileSidebar, closeMobileSidebar, setNotifications } = uiSlice.actions;
export default uiSlice.reducer;
