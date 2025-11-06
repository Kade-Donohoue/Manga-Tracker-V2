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
import { RedirectToSignIn, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import CookieBanner from './components/cookies';
import { queryClient } from './queryClient';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import addContainer from './pages/command/addManga/addContainer';
import ChangelogModal from './components/ChangelogModal';

import changelogs from './changelog.json';

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

// Add contexts here
export default function App(): React.ReactElement {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route
            path="/"
            element={
              <div>
                <SignedOut>
                  <Navigate to="/home" replace />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/tracked" replace />
                </SignedIn>
              </div>
            }
          />
          <Route
            path="/home"
            element={
              <SignedOut>
                <Home />
              </SignedOut>
            }
          />
          <Route
            path="/sign-in"
            element={
              <SignedOut>
                <CenteredPage>
                  <SignIn signUpUrl="/sign-up" />
                </CenteredPage>
              </SignedOut>
            }
          />
          <Route
            path="/sign-up"
            element={
              <SignedOut>
                <CenteredPage>
                  <SignUp signInUrl="/sign-in" />
                </CenteredPage>
              </SignedOut>
            }
          />

          {/* Protected app */}
          <Route
            path="/*"
            element={
              <div style={{ width: '100%', height: '100%' }}>
                <SignedIn>
                  <DesignSystemProvider>
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
                    <QueryClientProvider client={queryClient}>
                      <RootedApp />
                    </QueryClientProvider>
                  </DesignSystemProvider>
                </SignedIn>
                <SignedOut>
                  <RedirectToSignIn signInFallbackRedirectUrl={'/tracked'} />
                </SignedOut>
              </div>
            }
          />

          {/* Catch-all for unauthenticated access to protected pages */}
          <Route
            path="*"
            element={
              <div>
                <SignedOut>
                  <Navigate to="/home" replace />
                </SignedOut>
                <SignedIn>
                  <Navigate to="/tracked" replace />
                </SignedIn>
              </div>
            }
          />
        </Routes>
      </Router>
      <CookieBanner />
    </div>
  );
}

interface AppRoute {
  path: string;
  name: string;
  icon: any;
  component: () => JSX.Element;
}

const routes: Record<string, AppRoute> = {
  // home: {
  //   path: '/',
  //   name: 'Home',
  //   icon: HomeIcon,
  //   component: Home,
  // },
  tracked: {
    path: '/tracked',
    name: 'View Tracked',
    icon: ArtTrackIcon,
    component: tracked,
  },
  // feed: {
  //   path: '/feed',
  //   name: 'Feed',
  //   icon: DynamicFeedIcon,
  //   component: feed,
  // },
  addManga: {
    path: '/addManga',
    name: 'Add Manga',
    icon: AddCircleIcon,
    component: addContainer,
  },
  // addBookmarks: {
  //   path: '/addBookmarks',
  //   name: 'Import Bookmarks',
  //   icon: UploadFileIcon,
  //   component: addBookmarks
  // },
  // removeManga: {
  //   path: '/removeManga',
  //   name: 'Remove Manga',
  //   icon: DeleteForeverIcon,
  //   component: removeManga,
  // },
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
  // debug: {
  //   path: '/debug',
  //   name: 'Dev',
  //   icon: BugReportIcon,
  //   component: debug
  // },
  settings: {
    path: '/settings',
    name: 'Settings',
    icon: SettingsIcon,
    component: settings,
  },
};

export function RootedApp() {
  const theme = useTheme();
  const [sideBarExpanded, setSideBarExpanded] = React.useState(true);
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <S.SiteWrapper>
      <ChangelogModal changelogs={changelogs}/>
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
              {Object.values(routes).map((r) => (
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
