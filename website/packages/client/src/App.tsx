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
import feed from './pages/command/feed';
import addManga from './pages/command/addManga';
import removeManga from './pages/command/removeManga';
import stats from './pages/command/stats';
import tracked from './pages/command/viewTracked';
import addBookmarks from './pages/command/addBookmarks';
import settings from './pages/settings';
import friends from './pages/command/friends/friendsContainer';

import HomeIcon from '@mui/icons-material/Home';
import DynamicFeedIcon from '@mui/icons-material/DynamicFeed';
import ArtTrackIcon from '@mui/icons-material/ArtTrack';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import BugReportIcon from '@mui/icons-material/BugReport';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';

import * as S from './AppStyles';
import { IconButton } from '@mui/material';
import { RedirectToSignIn, SignedIn, SignedOut, SignIn, SignUp } from '@clerk/clerk-react';
import CookieBanner from './components/cookies';

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
  const queryClient = new QueryClient();

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

function RootedApp(): React.ReactElement {
  React.useEffect(() => {
    if (import.meta.env.DEV) {
      setFetchPath('');
    } else {
      setFetchPath(import.meta.env.VITE_SERVER_URL);
    }
  }, []);

  const [sideBarExpanded, setSideBarExpanded] = React.useState<boolean>(true);

  const location = useLocation();
  return (
    <S.SiteWrapper>
      <Scrollable.Root
        css={{
          border: '1px solid black',
          height: '100%',
          width: sideBarExpanded ? '200px' : '65px',
          '@small': { height: sideBarExpanded ? '200px' : '50px', width: '100%' },
          '@xsmall': { height: sideBarExpanded ? '100%' : '40px', width: '100%' },
        }}
      >
        <Scrollable.Viewport>
          <S.Ul>
            <IconButton
              sx={{ borderRadius: 0 }}
              onClick={(e) => setSideBarExpanded(!sideBarExpanded)}
            >
              <MenuIcon sx={{ fontSize: 30, align: 'left', color: 'white' }} />
            </IconButton>
            {Object.values(routes).map((r) => (
              <S.Li
                as={Link}
                to={r.path}
                key={r.path}
                selected={location.pathname === r.path}
                css={{ '@small': { display: sideBarExpanded ? 'block' : 'none' } }}
              >
                <p style={{ display: 'flex', alignItems: 'center', fontSize: 16 }}>
                  <r.icon sx={{ fontSize: 18, align: 'center' }} />
                  {sideBarExpanded ? ` ${r.name}` : ''}
                </p>
              </S.Li>
            ))}
          </S.Ul>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar orientation="vertical">
          <Scrollable.Thumb />
        </Scrollable.Scrollbar>
      </Scrollable.Root>
      <Scrollable.Root css={{ flex: 1 }}>
        <Scrollable.Viewport css={{ width: '100%' }}>
          <Routes>
            {Object.values(routes).map((r) => (
              <Route key={r.path} path={r.path} element={<r.component />} />
            ))}
          </Routes>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar orientation="vertical">
          <Scrollable.Thumb />
        </Scrollable.Scrollbar>
      </Scrollable.Root>
    </S.SiteWrapper>
  );
}
