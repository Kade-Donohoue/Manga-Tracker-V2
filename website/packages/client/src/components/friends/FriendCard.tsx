import { Avatar, Card, CardActionArea, CardActions, CardHeader, IconButton, MenuItem, Menu } from '@mui/material';
import Box from '@mui/material/Box';
import React from 'react';

import MoreVertIcon from '@mui/icons-material/MoreVert';
import { friend } from '../../types';
import { fetchPath } from '../../vars';
import { toast } from 'react-toastify';
import { QueryClient, useQueryClient } from '@tanstack/react-query';

export default function FriendCard({friend}: {friend:friend}) {

  const queryClient = useQueryClient();

  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);
  const handleMenuClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  async function removeFriend() {
    handleMenuClose()
    const notif = toast.loading('Sending Request!', { closeOnClick: true, draggable: true })
    const resp = await fetch(`${fetchPath}/api/friends/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requestId: friend.id
        })
      })
      if (!resp.ok) {
        return toast.update(notif, {
          render: (await resp.json() as any).message,
          type: 'error',
          isLoading: false,
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          draggable: true,
          progress: 0,
        })
      }
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.update(notif, {
        render: `Friendship Removed!`,
        type: 'success',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      })

      
  }

  return (
  <Card sx={{width: 320, height: 150}}>
    <CardActionArea>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: "blue" }} aria-label="User Icon" src={friend.imageURl}>
            {friend.userName.charAt(0)||"?"}
          </Avatar>
        }
        action={
          <div>
            <IconButton 
            aria-label="settings" 
            onClick={(e) => {
              e.stopPropagation();
              handleMenuClick(e);
            }}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="basic-menu"
              anchorEl={anchorEl}
              open={menuOpen}
              onClose={handleMenuClose}
              MenuListProps={{
                'aria-labelledby': 'basic-button',
              }}
            >
              <MenuItem onClick={handleMenuClose}>Open</MenuItem>
              <MenuItem onClick={removeFriend} sx={{color:"red"}}>Remove Friend</MenuItem>
            </Menu>

          </div>
        }
        title={friend.userName||"Unknown"}
        subheader={`Since ${new Date(friend.respondedAt.replace(" ", "Z")).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}`}
      />

      <CardActions sx={{display:"flex", justifyContent:"center"}}>
        <Box sx={{ textAlign: "center", px: 2 }}>
          Manga Tracked<br/>
          {friend.mangaCount}
        </Box>
        <Box sx={{ borderLeft: "1px solid #ffffff", height: "60px", mx: 2 }} />
        <Box sx={{ textAlign: "center", px: 2 }}>
          Chapters Read<br/>
          {friend.chaptersRead}
        </Box>
      </CardActions>
    </CardActionArea>
  </Card>
  )
}