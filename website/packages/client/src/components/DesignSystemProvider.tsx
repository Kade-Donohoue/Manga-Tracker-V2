import React from 'react';
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery } from '@mui/material';

interface DesignSystemProviderProps {
  children: React.ReactNode;
}

export default function DesignSystemProvider({ children }: DesignSystemProviderProps) {
  // Detect system theme
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)');

  // You can store the user preference in localStorage if needed
  const storedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
  const mode =
    storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : prefersDarkMode
        ? 'dark'
        : 'light';

  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#6366f1', // Indigo
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#fff',
            paper: mode === 'dark' ? '#1f1f1f' : '#fff',
          },
          text: {
            primary: mode === 'dark' ? '#fff' : '#000',
          },
        },
        typography: {
          fontFamily: 'Roboto, Arial, sans-serif',
        },
      }),
    [mode]
  );

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline applies global resets and default background color */}
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
