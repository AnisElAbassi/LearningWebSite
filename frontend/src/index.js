import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import App from './App';
import { store } from './store/store';
import { I18nProvider } from './hooks/useI18n';
import './styles/index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1c1c26',
                color: '#e5e7eb',
                border: '1px solid #252532',
              },
              success: { iconTheme: { primary: '#a855f7', secondary: '#0a0a0f' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#0a0a0f' } },
            }}
          />
          <App />
        </BrowserRouter>
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);
