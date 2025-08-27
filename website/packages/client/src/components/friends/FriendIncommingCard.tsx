import { timeAgo } from '../../utils';
import { toast } from 'react-toastify';
import { fetchPath } from '../../vars';
import { useQueryClient } from '@tanstack/react-query';

import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardHeader from '@mui/material/CardHeader';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import MoreVertIcon from '@mui/icons-material/MoreVert';

export default function FriendIncommingCard(userData: {
  userId: string;
  userName: string;
  sentAt: Date;
  imgUrl: string;
  requestId: number;
}) {
  const queryClient = useQueryClient();

  async function updateRequest(requestId: number, newStatus: string) {
    const notif = toast.loading('Accepting Request!', { closeOnClick: true, draggable: true });

    const results = await fetch(`${fetchPath}/api/friends/updateStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId: requestId,
        status: newStatus,
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
      render: `Request ${newStatus}!`,
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
          sx={{ width: '40%', mx: 0.2 }}
          onClick={() => updateRequest(userData.requestId, 'accepted')}
        >
          <CheckIcon />
        </Button>
        <Button
          variant="outlined"
          sx={{ width: '40%' }}
          onClick={() => updateRequest(userData.requestId, 'declined')}
        >
          <CloseIcon />
        </Button>
      </CardActions>
    </Card>
  );
}
