import * as React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import DesignSystemProvider from './components/DesignSystemProvider';

import Home from './pages/Home';
import stats from './pages/command/stats';
import tracked from './pages/command/viewTracked';
import settings from './pages/settings';
import friends from './pages/command/friends/friendsContainer';

import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BugReportIcon from '@mui/icons-material/BugReport';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';

import * as S from './AppStyles';
import IconButton from '@mui/material/IconButton';
import { queryClient } from './queryClient';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import addContainer from './pages/command/addManga/addContainer';
import ChangelogModal from './components/ChangelogModal';

import changelogs from './changelog.json';

import SignInPage from './pages/auth/SignInPage';
import SignUpPage from './pages/auth/SignUpPage';
import { useAuthStatus } from './hooks/useAuthStatus';
import admin from './pages/admin/admin';
import ForgotPasswordPage from './pages/auth/forgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import { useAutoPush } from './hooks/useAutoPush';
import TermsOfService from './pages/policies/tos';
import PrivacyPolicy from './pages/policies/privacy';
import CookiePolicy from './pages/policies/cookie';

interface CenteredPageProps {
  children: React.ReactNode;
}

const CenteredPage: React.FC<CenteredPageProps> = ({ children }) => (
  <div
    style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#1a1a1a',
    }}
  >
    {children}
  </div>
);

interface AppRoute {
  path: string;
  name: string;
  icon: any;
  component: () => JSX.Element;
  role?: string;
}

const routes: Record<string, AppRoute> = {
  tracked: {
    path: '/tracked',
    name: 'View Tracked',
    icon: ArtTrackIcon,
    component: tracked,
  },
  addManga: {
    path: '/addManga',
    name: 'Add Manga',
    icon: AddCircleIcon,
    component: addContainer,
  },
  stats: {
    path: '/stats',
    name: 'Statistics',
    icon: AnalyticsIcon,
    component: stats,
  },
  friends: {
    path: '/friends',
    name: 'Friends',
    icon: GroupIcon,
    component: friends,
  },
  settings: {
    path: '/settings',
    name: 'Settings',
    icon: SettingsIcon,
    component: settings,
  },
  debug: {
    path: '/debug',
    name: 'Admin',
    icon: BugReportIcon,
    component: admin,
    role: 'admin',
  },
};

export function RootedApp() {
  const theme = useTheme();
  const [sideBarExpanded, setSideBarExpanded] = React.useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const { isLoggedIn, isLoading, session, user } = useAuthStatus();

  return (
    <S.SiteWrapper>
      <ChangelogModal changelogs={changelogs} />
      {/* Sidebar / Bottom Nav */}
      {!isMobile ? (
        // Desktop / Tablet Sidebar
        <Box
          sx={{
            width: sideBarExpanded ? 200 : 65,
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid',
            borderColor: 'divider',
            flexShrink: 0,
          }}
        >
          {/* Collapse Button */}
          <IconButton
            onClick={() => setSideBarExpanded(!sideBarExpanded)}
            sx={{
              width: '100%',
              height: 56,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              borderRadius: 0,
              mb: 1,
            }}
          >
            <MenuIcon sx={{ fontSize: 30, color: 'white' }} />
          </IconButton>

          {/* Nav Items */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              '&::-webkit-scrollbar': { width: 6 },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(255,255,255,0.2)',
                borderRadius: 3,
              },
            }}
          >
            <S.Ul>
              {Object.values(routes)
                .filter(
                  (r) => !r.role || (!isLoading && r.role === user.role) || session?.impersonatedBy
                )
                .map((r) => (
                  <S.Li
                    key={r.path}
                    to={r.path}
                    selected={location.pathname === r.path}
                    sx={{
                      display: 'flex',
                      gap: 1,
                    }}
                  >
                    <r.icon sx={{ fontSize: 20 }} />
                    {sideBarExpanded && <span>{r.name}</span>}
                  </S.Li>
                ))}
            </S.Ul>
          </Box>
        </Box>
      ) : (
        // Mobile Bottom Bar
        <Box
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: 56,
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            backgroundColor: theme.palette.background.paper,
            zIndex: 10,
          }}
        >
          {Object.values(routes).map((r) => (
            <S.Li
              key={r.path}
              to={r.path}
              selected={location.pathname === r.path}
              sx={{
                flex: 1,
                justifyContent: 'center',
                display: 'flex',
              }}
            >
              <r.icon sx={{ fontSize: 24 }} />
            </S.Li>
          ))}
        </Box>
      )}

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', pb: isMobile ? 7 : 0 }}>
        <Routes>
          {Object.values(routes).map((r) => (
            <Route key={r.path} path={r.path} element={<r.component />} />
          ))}
        </Routes>
      </Box>
    </S.SiteWrapper>
  );
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn, isLoading, session, user } = useAuthStatus();

  useAutoPush(true);

  if (isLoading) return <div>loading...</div>;

  if (!isLoggedIn) return <Navigate to="/home" replace />;

  return <>{children}</>;
};

const UnprotectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoggedIn } = useAuthStatus();

  if (isLoggedIn) return <Navigate to="/tracked" replace />;

  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DesignSystemProvider>
        <Router>
          <Routes>
            <Route
              path="/"
              element={
                <UnprotectedRoute>
                  <Navigate to="/home" replace />
                </UnprotectedRoute>
              }
            />
            <Route
              path="/home"
              element={
                <UnprotectedRoute>
                  <Home />
                </UnprotectedRoute>
              }
            />
            <Route
              path="/sign-in/*"
              element={
                <UnprotectedRoute>
                  <SignInPage />
                </UnprotectedRoute>
              }
            />
            <Route
              path="/sign-up/*"
              element={
                <UnprotectedRoute>
                  <SignUpPage />
                </UnprotectedRoute>
              }
            />
            <Route
              path="/forgot-password/*"
              element={
                <UnprotectedRoute>
                  <ForgotPasswordPage />
                </UnprotectedRoute>
              }
            />
            <Route
              path="/reset-password/*"
              element={
                // <UnprotectedRoute>
                <ResetPasswordPage />
                // {/* </UnprotectedRoute> */}
              }
            />
            <Route
              path="/tos"
              element={
                // <UnprotectedRoute>
                <TermsOfService />
                // </UnprotectedRoute>
              }
            />
            <Route
              path="/privacy-policy"
              element={
                // <UnprotectedRoute>
                <PrivacyPolicy />
                // </UnprotectedRoute>
              }
            />
            <Route
              path="/cookies-policy"
              element={
                // <UnprotectedRoute>
                <CookiePolicy />
                // </UnprotectedRoute>
              }
            />

            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <RootedApp />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          theme="dark"
        />
      </DesignSystemProvider>
    </QueryClientProvider>
  );
}
