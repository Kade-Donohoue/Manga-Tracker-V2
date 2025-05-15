import { Avatar, Button, Card, CardActionArea, CardActions, CardContent, CardHeader, Tooltip, Typography } from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function FriendOutgoingCard(userData:{userId:string, userName:string, imgUrl:string}) {

  return (
  <Card sx={{width: 320}}>
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
        subheader="2 Hours Ago"
      />

      <CardActions sx={{display:"flex", justifyContent:"center"}}>
        <Button variant='outlined' sx={{width:'100%'}}><CloseIcon/></Button>
      </CardActions>
  </Card>
  )
}