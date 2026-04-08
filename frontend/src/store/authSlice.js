import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../utils/api';

export const login = createAsyncThunk('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('pg_token', data.token);
    localStorage.setItem('pg_user', JSON.stringify(data.user));
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Login failed');
  }
});

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me');
    return data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.error || 'Session expired');
  }
});

const storedUser = localStorage.getItem('pg_user');

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: localStorage.getItem('pg_token'),
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('pg_token');
      localStorage.removeItem('pg_user');
    },
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchMe.fulfilled, (state, action) => { state.user = action.payload; })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null;
        state.token = null;
        localStorage.removeItem('pg_token');
        localStorage.removeItem('pg_user');
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;
