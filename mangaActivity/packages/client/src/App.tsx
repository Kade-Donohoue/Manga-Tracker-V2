import * as React from 'react'
import {BrowserRouter as Router, Routes, Route, Link, useLocation} from 'react-router-dom'

import * as Scrollable from './components/Scrollable'
import {AuthProvider} from './components/AuthProvider'
import DesignSystemProvider from './components/DesignSystemProvider'

import Home from './pages/Home'
import feed from './pages/command/feed'
import addManga from './pages/command/addManga'
import removeManga from './pages/command/removeManga'
import stats from './pages/command/stats'
import debug from './pages/debug'

import * as S from './AppStyles'

// Add contexts here
export default function App(): React.ReactElement {
  return (
    <AuthProvider>
      <DesignSystemProvider>
        <Router>
          <RootedApp />
        </Router>
      </DesignSystemProvider>
    </AuthProvider>
  );
}

interface AppRoute {
  path: string;
  name: string;
  component: () => JSX.Element;
}

const routes: Record<string, AppRoute> = {
  home: {
    path: '/',
    name: 'Home',
    component: Home,
  },
  customExternalLink: {
    path: '/feed',
    name: 'Feed',
    component: feed
  },
  addManga: {
    path: '/addManga',
    name: 'Add Manga',
    component: addManga
  },
  removeManga: {
    path: '/removeManga',
    name: 'Remove Manga',
    component: removeManga
  },
  stats: {
    path: '/stats',
    name: 'Statistics',
    component: stats
  }
  // debug: {
  //   path: '/debug',
  //   name: 'Dev',
  //   component: debug
  // }
}

function RootedApp(): React.ReactElement {
  const location = useLocation();
  return (
    <S.SiteWrapper>
      <Scrollable.Root
        css={{
          border: '1px solid black',
          height: '100%',
          width: '200px',
          '@small': {height: '200px', width: '100%'},
          '@xsmall': {height: 0, width: '100%'},
        }}>
        <Scrollable.Viewport>
          <S.Ul>
            {Object.values(routes).map((r) => (
              <S.Li as={Link} to={r.path} key={r.path} selected={location.pathname === r.path}>
                <p>{r.name}</p>
              </S.Li>
            ))}
          </S.Ul>
        </Scrollable.Viewport>
        <Scrollable.Scrollbar orientation="vertical">
          <Scrollable.Thumb />
        </Scrollable.Scrollbar>
      </Scrollable.Root>
      <Scrollable.Root css={{flex: 1}}>
        <Scrollable.Viewport css={{width: '100%'}}>
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
  )
}
