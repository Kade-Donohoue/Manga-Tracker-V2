import { Avatar, Card, CardActionArea, CardActions, CardContent, CardHeader, IconButton, Tooltip, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import React from 'react';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useGridNativeEventListener } from '@mui/x-data-grid';

export default function FriendCard(userData:{userId:string, userName:string, imgUrl:string, mangaTracked:string, chaptersRead:string}) {

  return (
  <Card sx={{width: 320}}>
    <CardActionArea>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: "blue" }} aria-label="User Icon" src={userData.imgUrl}>
            {userData.userName.charAt(0)||"?"}
          </Avatar>
        }
        action={
          <IconButton 
          aria-label="settings" 
          onClick={(e) => {
            e.stopPropagation();
          }}
          >
            <MoreVertIcon />
          </IconButton>
        }
        title={userData.userName||"Unknown"}
        // subheader="September 14, 2016"
      />

      <CardActions sx={{display:"flex", justifyContent:"center"}}>
        <Box sx={{ textAlign: "center", px: 2 }}>
          Manga Tracked<br/>
          {userData.mangaTracked}
        </Box>
        <Box sx={{ borderLeft: "1px solid #ffffff", height: "60px", mx: 2 }} />
        <Box sx={{ textAlign: "center", px: 2 }}>
          Chapters Read<br/>
          {userData.chaptersRead}
        </Box>
      </CardActions>
    </CardActionArea>
  </Card>
  )
}