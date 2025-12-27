import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import { AuthProvider } from './context/AuthContext';
import { BrowserRouter, useNavigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import './index.css';
import App from './App.jsx';

// Component to handle redirect from 404.html
function RedirectHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Check if we have a stored redirect path from 404.html
    const redirectPath = sessionStorage.getItem('redirectPath');
    if (redirectPath && location.pathname === '/') {
      sessionStorage.removeItem('redirectPath');
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, location]);

  return null;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <RedirectHandler />
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#4aed88',
                },
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
