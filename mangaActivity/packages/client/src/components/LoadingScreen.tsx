import * as React from 'react';
import CircularProgress from '@mui/material/CircularProgress';

export function LoadingScreen() {
  return (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", width: "100%", height: "100vh", backgroundColor: "#151718", color: "#ffffff", flexDirection: "column" }}>
    <CircularProgress size={200} sx={{display:"flex", justifyContent: "center", width:"100%", height: "100vh", alignItems: "center", padding:"30px"}}/>
    <br/>
    <h1 style={{display:"flex", justifyContent: "center", margin:"30px 0", padding:"30px"}}> Loading</h1>
  </div>
)
}
