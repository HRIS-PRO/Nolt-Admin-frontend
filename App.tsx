
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { UserState, LoanState, Theme, SavedDraft } from './types';
import Navigation from './components/Navigation';
import Dashboard from './pages/Dashboard';
import ProductSelect from './pages/ProductSelect';
import LoanFlow from './pages/LoanFlow';
import InvestmentFlow from './pages/InvestmentFlow';
import SuccessScreen from './pages/SuccessScreen';
import ApplicationsList from './pages/ApplicationsList';
import Calculator from './pages/Calculator';
import AuthLayout from './components/layouts/AuthLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyPage from './pages/auth/VerifyPage';
import OnboardingPage from './pages/auth/OnboardingPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import RestrictedAccessPage from './pages/RestrictedAccessPage';
import StaffDashboard from './pages/StaffDashboard';
import StaffPlaceholderPage from './pages/StaffPlaceholderPage';
import SettingsPage from './pages/SettingsPage';
import LoanQueuePage from './pages/LoanQueuePage';
import LoanDetailsPage from './pages/LoanDetailsPage';
import UsersPage from './pages/UsersPage';
import AuditTrailPage from './pages/AuditTrailPage';
import axios from 'axios';
import ReportsPage from './pages/ReportsPage';
import CustomersPage from './pages/CustomersPage';
import TimelineReportPage from './pages/TimelineReportPage';
import StaffInvestmentsPage from './pages/StaffInvestmentsPage';
import VerifyGiftPage from './pages/investment/VerifyGiftPage';
import ClaimGiftPage from './pages/investment/ClaimGiftPage';

import LogoutWarningModal from './components/modals/LogoutWarningModal';

// ProtectedRoute Component extracted to prevent re-renders
interface ProtectedRouteProps {
  children: React.ReactElement;
  user: UserState;
  isLoading: boolean;
  theme: Theme;
  onLogout: () => void;
  onToggleTheme: () => void;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, user, isLoading, theme, onLogout, onToggleTheme }) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user.isLoggedIn) {
    return <Navigate to="/login" replace />;
  }

  // Onboarding is only for customers
  if (user.new_comer && user.role === 'customer') {
    return <Navigate to="/onboarding" replace />;
  }

  if (user.role && user.role !== 'customer') {
    return <Navigate to="/staff-dashboard" replace />;
  }
  return (
    <>
      <Navigation
        user={user}
        theme={theme}
        onLogout={onLogout}
        onDashboard={() => { }} // Navigation handled by Links in Navigation component ideally, or ignored here
        onToggleTheme={onToggleTheme}
      />
      <main className="flex-1">
        {children}
      </main>
      <footer className="py-8 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
          <p>© 2024 NOLT Finance. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </>
  );
};

const AppContent: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigateRouter = useNavigate();

  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'light';
  });

  const [lastProduct, setLastProduct] = useState<'LOAN' | 'INVESTMENT'>('LOAN');
  const [resumeDraft, setResumeDraft] = useState<SavedDraft | null>(null);
  // Use relative path (proxy) by default for First-Party Cookies on Vercel
  // Only use VITE_BACKEND_URL if explicitly set (e.g. for local dev without proxy)
  const backendUrl = ''; // Force relative path to use Vercel Rewrites
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserState>({
    email: '',
    name: '',
    isLoggedIn: false
  });

  // Resume Gift Choice after Login
  useEffect(() => {
    if (user.isLoggedIn) {
      const pendingToken = sessionStorage.getItem('pending_gift_token');
      if (pendingToken) {
        console.log("Resuming pending gift claim:", pendingToken);
        sessionStorage.removeItem('pending_gift_token');
        navigateRouter(`/investment?gift_token=${pendingToken}`, { replace: true });
      }
    }
  }, [user.isLoggedIn, navigateRouter, user.email]);

  const [showLogoutModal, setShowLogoutModal] = useState(false);


  const refreshUser = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/me`, {
        withCredentials: true
      });

      console.log(data)
      setUser({
        email: data.email,
        name: data.full_name || data.name || 'User',
        isLoggedIn: true,
        avatar_url: data.avatar_url,
        role: data.role,
        new_comer: data.new_comer,
        // Map full_name to name for frontend consistency
        full_name: data.full_name,
        referral_code_used: data.referral_code_used
      });
    } catch (error) {
      console.error("Failed to fetch user", error);
      // User remains logged out
    } finally {
      setIsLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // console.log("the user", user)
  // console.log("the user", user)




  const [loan, setLoan] = useState<LoanState>({
    type: 'Business',
    amount: 15000,
    term: 24,
    interestRate: 8.4,
    monthlyPayment: 681.20,
    status: 'DRAFT'
  });

  // Dark mode effect
  useEffect(() => {
    localStorage.setItem('theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  const handleLogin = useCallback((email: string, userData?: Partial<UserState>) => {
    setUser(prev => ({
      ...prev,
      email,
      isLoggedIn: true,
      ...userData,
      // Ensure name falls back to prev or default if not provided
      name: userData?.name || (userData as any)?.full_name || prev.name || 'User'
    }));
  }, []);

  // Handle Google Login Callback
  useEffect(() => {
    if (searchParams.get('login') === 'success') {
      // handleLogin('google-user@example.com');
      // Remove query param
      navigateRouter('/dashboard', { replace: true });
    }
  }, [searchParams, handleLogin, navigateRouter]);

  const performLogout = useCallback(async () => {
    try {
      const backendUrl = ''; // Use proxy
      // If backendUrl is empty, it means we are using proxy (relative path)
      const url = backendUrl ? `${backendUrl}/auth/logout` : '/auth/logout';
      await fetch(url, {
        credentials: 'include'
      });
    } catch (e) {
      console.error("Logout failed", e);
    } finally {
      setUser({ email: '', name: 'Alex Morgan', isLoggedIn: false });
      setResumeDraft(null);
      setShowLogoutModal(false); // Close modal
    }
  }, []);

  const handleLogoutRequest = useCallback(() => {
    setShowLogoutModal(true);
  }, []);

  // --- Auto Logout Logic ---
  useEffect(() => {
    if (!user.isLoggedIn) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      // 1 hour = 3600000 ms
      timeoutId = setTimeout(() => {
        console.log("Auto-logout triggered due to inactivity");
        performLogout();
      }, 3600000);
    };

    // Initial start
    resetTimer();

    // Event listeners for activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    const handleActivity = () => resetTimer();

    events.forEach(event => window.addEventListener(event, handleActivity));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, handleActivity));
    };
  }, [user.isLoggedIn, performLogout]);


  // Socket Connection Logic
  useEffect(() => {
    import('./services/socket').then(({ socket }) => {
      if (user.isLoggedIn && user.role !== 'customer') {
        if (!socket.connected) {
          socket.connect();
          console.log("Socket connecting...");
        }
      } else {
        if (socket.connected) {
          socket.disconnect();
          console.log("Socket disconnected");
        }
      }
    });

    return () => {
      // We might not want to disconnect on every unmount if we want persistence, 
      // but for App level it's fine.
    };
  }, [user.isLoggedIn, user.role]);


  // Format money helper
  const formatMoney = useMemo(() => (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  const handleLoanComplete = useCallback(() => {
    setLastProduct('LOAN');
    setResumeDraft(null);
  }, []);

  const handleInvestmentComplete = useCallback(() => {
    setLastProduct('INVESTMENT');
    setResumeDraft(null);
  }, []);

  const handleLegacyNavigate = (step: string, draft?: SavedDraft | null) => {
    if (draft) {
      setResumeDraft(draft);
    }

    // Map legacy steps to routes
    const routeMap: Record<string, string> = {
      'DASHBOARD': '/dashboard',
      'PRODUCT_SELECT': '/products',
      'APPLICATIONS_LIST': '/applications',
      'CALCULATOR': '/calculator',
      'LOAN_TYPE': '/loan',
      'INVESTMENT_FLOW': '/investment'
    };

    const route = routeMap[step] || '/dashboard';
    navigateRouter(route);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 transition-all duration-300">
      <LogoutWarningModal
        isOpen={showLogoutModal}
        onConfirm={performLogout}
        onCancel={() => setShowLogoutModal(false)}
      />

      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          isLoading ? null : (user.isLoggedIn ? (user.new_comer ? <Navigate to="/onboarding" /> : <Navigate to="/dashboard" />) : (
            <AuthLayout>
              <LoginPage onLogin={handleLogin} />
            </AuthLayout>
          ))
        } />
        <Route path="/register" element={
          isLoading ? null : (user.isLoggedIn ? <Navigate to="/dashboard" /> : (
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          ))
        } />
        <Route path="/verify" element={
          isLoading ? null : (user.isLoggedIn && user.new_comer ? <Navigate to="/onboarding" /> : (
            <AuthLayout>
              <VerifyPage onLogin={handleLogin} />
            </AuthLayout>
          ))
        } />
        <Route path="/forgot-password" element={
          isLoading ? null : (user.isLoggedIn ? <Navigate to="/dashboard" /> : (
            <ForgotPasswordPage />
          ))
        } />
        <Route path="/reset-password" element={
          isLoading ? null : (user.isLoggedIn ? <Navigate to="/dashboard" /> : (
            <ResetPasswordPage />
          ))
        } />
        <Route path="/onboarding" element={
          isLoading ? null : (!user.isLoggedIn ? <Navigate to="/login" /> : (!user.new_comer ? <Navigate to="/dashboard" /> : (
            <AuthLayout>
              <OnboardingPage onComplete={async () => {
                // Call backend to complete onboarding
                try {
                  const backendUrl = ''; // Use proxy
                  await axios.put(`${backendUrl}/api/onboarding-complete`, {}, { withCredentials: true });
                  // Update local state by refetching from backend to get referral code
                  await refreshUser();
                  navigateRouter('/dashboard');
                } catch (e) {
                  console.error("Failed to complete onboarding", e);
                }
              }} />
            </AuthLayout>
          )))
        } />

        <Route path="/staff-dashboard" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <StaffDashboard
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />

        {/* Staff Routes */}
        <Route path="/staff/loans" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <LoanQueuePage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/investments" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <StaffInvestmentsPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/loans/:id" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <LoanDetailsPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/reports" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <ReportsPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/settings" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <SettingsPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/users" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <UsersPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/customers" element={
          isLoading ? null : (user.isLoggedIn && user.role !== 'customer' ? (
            <CustomersPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/audit" element={
          isLoading ? null : (user?.isLoggedIn && user.role !== 'customer' ? (
            <AuditTrailPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />
        <Route path="/staff/timeline" element={
          isLoading ? null : (user?.isLoggedIn && user.role !== 'customer' ? (
            <TimelineReportPage
              user={user}
              onLogout={handleLogoutRequest}
              toggleTheme={toggleTheme}
              theme={theme}
            />
          ) : <Navigate to="/login" />)
        } />

        {/* Protected Routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <Dashboard navigate={(step) => handleLegacyNavigate(step)} />
          </ProtectedRoute>
        } />

        <Route path="/products" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <ProductSelect navigate={handleLegacyNavigate} />
          </ProtectedRoute>
        } />

        <Route path="/applications" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <ApplicationsList navigate={handleLegacyNavigate} formatMoney={formatMoney} />
          </ProtectedRoute>
        } />

        <Route path="/calculator" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <Calculator navigate={handleLegacyNavigate} formatMoney={formatMoney} />
          </ProtectedRoute>
        } />

        <Route path="/loan/*" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <LoanFlow
              initialStep="TYPE"
              onComplete={handleLoanComplete}
              navigate={handleLegacyNavigate}
              formatMoney={formatMoney}
              initialDraft={resumeDraft}
              referralCodeUsed={user.referral_code_used}
            />
          </ProtectedRoute>
        } />

        <Route path="/investment/*" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <InvestmentFlow
              navigate={handleLegacyNavigate}
              onComplete={handleInvestmentComplete}
              formatMoney={formatMoney}
              initialDraft={resumeDraft}
            />
          </ProtectedRoute>
        } />

        <Route path="/investment/verify-payment" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <VerifyGiftPage />
          </ProtectedRoute>
        } />

        <Route path="/claim-gift" element={<ClaimGiftPage />} />

        <Route path="/success" element={
          <ProtectedRoute user={user} isLoading={isLoading} theme={theme} onLogout={handleLogoutRequest} onToggleTheme={toggleTheme}>
            <SuccessScreen
              onDashboard={() => { }}
              loan={loan}
              formatMoney={formatMoney}
              productType={lastProduct}
            />
          </ProtectedRoute>
        } />

        {/* Default Redirect */}
        <Route path="/restricted" element={<RestrictedAccessPage onLogout={handleLogoutRequest} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
