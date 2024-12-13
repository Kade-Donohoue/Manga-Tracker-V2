import * as React from 'react'
import {LoadingScreen} from './LoadingScreen'
import {authStore} from '../stores/authStore'
import {start} from '../actions/authActions'
import { Button } from '@mui/material'

export function AuthProvider({children}: {children: React.ReactNode}) {
  const auth = authStore()
  const queryParams = new URLSearchParams(window.location.search)
  const isEmbedded = queryParams.get('frame_id') != null
  const isElectron = typeof window.electron !== 'undefined' && window.electron.isElectron;
  const electronRedirectUri = 'https://manga.kdonohoue.com/electron';

  React.useEffect(() => {
    start(isEmbedded)
  }, [])

  const handleLogin = () => {
    const redirectUri = isElectron ? electronRedirectUri : import.meta.env.VITE_CLIENT_URL;
    const signInUrl = `https://discord.com/oauth2/authorize?client_id=${import.meta.env.VITE_CLIENT_ID}&response_type=code&redirect_uri=${redirectUri}&integration_type=1&scope=identify+applications.commands`;
    
    if (isElectron) {
      (window as any).electron.openOAuth(signInUrl);
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
