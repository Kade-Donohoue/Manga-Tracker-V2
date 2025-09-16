import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ClerkProvider } from '@clerk/clerk-react';
import { dark } from '@clerk/themes';

import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  throw new Error('Missing Publishable Key');
}

const theme = createTheme({
  palette: {
    mode: 'dark',
  },
});

// const root = document.getElementById('root')!;
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(
  <React.StrictMode>
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      afterSignOutUrl="/"
      appearance={{ baseTheme: dark }}
    >
      <ThemeProvider theme={theme}>
        <App />
      </ThemeProvider>
    </ClerkProvider>
  </React.StrictMode>
);
