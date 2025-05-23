import {
  Avatar,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardHeader,
  Tooltip,
  Typography,
} from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import React from 'react';

import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { timeAgo } from '../../utils';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { fetchPath } from '../../vars';
import friends from '../../pages/command/friends/friendsContainer';

export default function FriendOutgoingCard(userData: {
  userId: string;
  userName: string;
  sentAt: Date;
  imgUrl: string;
  requestId: number;
}) {
  const queryClient = useQueryClient();

  async function cancelRequest(requestId: number) {
    const notif = toast.loading('Sending Request!', { closeOnClick: true, draggable: true });

    const userName = (document.getElementById('userNameInput') as HTMLInputElement)?.value;

    const results = await fetch(`${fetchPath}/api/friends/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: requestId,
      }),
    });

    if (!results.ok) {
      return toast.update(notif, {
        render: ((await results.json()) as any).message,
        type: 'error',
        isLoading: false,
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        draggable: true,
        progress: 0,
      });
    }

    toast.update(notif, {
      render: 'Request Canceled!',
      type: 'success',
      isLoading: false,
      autoClose: 5000,
      hideProgressBar: false,
      closeOnClick: true,
      draggable: true,
      progress: 0,
    });

    queryClient.invalidateQueries({ queryKey: ['friends'] });
  }

  return (
    <Card sx={{ width: 320, height: 150 }}>
      <CardHeader
        avatar={
          <Avatar sx={{ bgcolor: 'blue' }} aria-label="User Icon" src={userData.imgUrl}>
            {userData.userName.charAt(0) || '?'}
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
        title={userData.userName || 'Unknown'}
        subheader={timeAgo(userData.sentAt)}
      />

      <CardActions sx={{ display: 'flex', justifyContent: 'center' }}>
        <Button
          variant="outlined"
          sx={{ width: '100%' }}
          onClick={() => cancelRequest(userData.requestId)}
        >
          <CloseIcon />
        </Button>
      </CardActions>
    </Card>
  );
}
