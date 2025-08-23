import * as React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import * as Scrollable from './components/Scrollable';
import DesignSystemProvider from './components/DesignSystemProvider';
import { setFetchPath } from './vars';

import Home from './pages/Home';
import addManga from './pages/command/addManga';
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
                  <RedirectToSignIn signInFallbackRedirectUrl={'/home'} />
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
    component: addManga,
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

  return (
    <S.SiteWrapper>
      {/* Sidebar */}
      <Box
        sx={{
          width: sideBarExpanded ? 200 : 65,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
          [theme.breakpoints.down('sm')]: { width: '100%' },
        }}
      >
        <IconButton
          // sx={{ borderRadius: 0 }}
          onClick={() => setSideBarExpanded(!sideBarExpanded)}
          sx={{
            width: '100%',
            height: 56, // or whatever row height you want
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: 0,
            mb: 1, // optional margin below
          }}
        >
          <MenuIcon sx={{ fontSize: 30, color: 'white' }} />
        </IconButton>
        <Box
          sx={{
            flex: 1, // fills remaining vertical space
            overflowY: 'auto', // allows scrolling
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
                  display: { xs: sideBarExpanded ? 'flex' : 'none', sm: 'flex' },
                }}
              >
                <r.icon sx={{ fontSize: 20 }} />
                {sideBarExpanded && <span>{r.name}</span>}
              </S.Li>
            ))}
          </S.Ul>
        </Box>
      </Box>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        <Routes>
          {Object.values(routes).map((r) => (
            <Route key={r.path} path={r.path} element={<r.component />} />
          ))}
        </Routes>
      </Box>
    </S.SiteWrapper>
  );
}
