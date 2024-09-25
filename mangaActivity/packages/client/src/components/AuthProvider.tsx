import * as React from 'react'
import {LoadingScreen} from './LoadingScreen'
import {authStore} from '../stores/authStore'
import {start} from '../actions/authActions'
import { Button } from '@mui/material'

export function AuthProvider({children}: {children: React.ReactNode}) {
  const auth = authStore()
  const queryParams = new URLSearchParams(window.location.search)
  const isEmbedded = queryParams.get('frame_id') != null

  React.useEffect(() => {
    start(isEmbedded)
  }, [])

  if (auth.user == null) {
    if (isEmbedded) {
      return <LoadingScreen />
    } else {
      return (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100vh", backgroundColor: "#151718", color: "#ffffff", flexDirection: "column" }}>
          <Button 
          href='https://discord.com/oauth2/authorize?client_id=1213553872635699240&response_type=code&redirect_uri=https%3A%2F%2Fdevmanga.kdonohoue.com&integration_type=1&scope=identify+applications.commands'
          >
            Sign In With Discord
          </Button>
        </div>
      )
    }
  } 

  return <>{children}</>
}
