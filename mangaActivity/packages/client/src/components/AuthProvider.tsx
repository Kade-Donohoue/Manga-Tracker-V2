import * as React from 'react'
import {LoadingScreen} from './LoadingScreen'
import {authStore} from '../stores/authStore'
import {start} from '../actions/authActions'
import { Button } from '@mui/material'
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import getPkce from 'oauth-pkce';
import { App } from '@capacitor/app'
import { Preferences } from '@capacitor/preferences'

export function AuthProvider({children}: {children: React.ReactNode}) {
  const auth = authStore()
  const queryParams = new URLSearchParams(window.location.search)
  const isEmbedded = queryParams.get('frame_id') != null
  const isCapacitorApp = Capacitor.isNativePlatform();
  const isElectron = typeof window.electron !== 'undefined' && window.electron.isElectron;
  const electronRedirectUri = 'https://manga.kdonohoue.com/electron';

  React.useEffect(() => {

    // Function to handle deep link events
    const handleAppUrlOpen = (event: { url: string }) => {
      console.log('Deep link received:', event.url);
    
      if (event.url.startsWith('kd://callback')) {
        const url = new URL(event.url);
        console.log('Received URL:', url.toString());
        console.log('Query Parameters:', Array.from(url.searchParams.entries()));
    
        // Use the `url.searchParams` to correctly extract parameters
        const code = url.searchParams.get('code');
        if (!code) {
          console.log('No Code in authProvider?');
        } else {
          console.log('Extracted code:', code);
        }
    
        // Replace "start(false)" with your actual OAuth processing logic
        start(false, code || ''); // Ensure code is passed even if null
      } else {
        console.log('Unrecognized deep link:', event.url);
      }
    };

    // Add the deep link listener only if running on a native platform
    console.log('Capacitor?:' + isCapacitorApp)
    if (isCapacitorApp) {
      console.log('Registering appUrlOpen listener');
      App.addListener('appUrlOpen', handleAppUrlOpen);
    }


    start(isEmbedded)
    console.log('isCapacitor: ' + isCapacitorApp)

    // Cleanup on unmount
    return () => {
      App.removeAllListeners();
    };
  }, []);

  async function setStorage(key: string, value: string): Promise<void> {
    if (Capacitor.isNativePlatform()) {
      await Preferences.set({ key, value });
    } else {
      localStorage.setItem(key, value);
    }
  }

  const handleLogin = async () => {
    console.log('isCapacitor: ' + isCapacitorApp)
    let redirectUri = isElectron ? electronRedirectUri : isCapacitorApp?'kd://callback':import.meta.env.VITE_CLIENT_URL;
    const signInUrl = `https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&integration_type=1&scope=identify+applications.commands`;
    
    if (isElectron) {
      (window as any).electron.openOAuth(signInUrl);
    } else if (isCapacitorApp) {
      const { verifier, challenge } = await new Promise<{verifier:string, challenge:string}>((resolve) => {
        getPkce(43, (error, { verifier, challenge }) => {
          if (error) throw error;
          resolve({ verifier, challenge });
        });
      });
      setStorage('codeVerifier', verifier)
      Browser.open({ url: signInUrl+`&code_challenge=${challenge}&code_challenge_method=S256`})
    } else {
      window.location.href = signInUrl;
    }
  };
  

  if (auth.user == null) {
    if (isEmbedded) {
      return <LoadingScreen />
    } else {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100vh", backgroundColor: "#151718", color: "#ffffff", flexDirection: "column" }}>
          <Button 
            onClick={handleLogin}
          >
            Sign In With Discord
          </Button>
        </div>
      )
    }
  } 

  return <>{children}</>
}
