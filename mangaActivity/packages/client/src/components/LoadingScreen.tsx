import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export function LoadingScreen() {
  return (
  <div style={{width: "100%", height: "100vh", display:"flex", justifyContent: "center", alignItems: "center", backgroundColor: "#151718", color:"#ffffff"}}>
    <CircularProgress/>
    <br/>
    <h1>Loading</h1>
  </div>
)
}
