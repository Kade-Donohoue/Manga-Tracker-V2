import Box from '@mui/material/Box';
import FriendOutgoingCard from '../../../components/friends/FriendOutgoingCard';
import { friend } from '../../../types';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { Card, CardActionArea } from '@mui/material';

import AddCircleOutlinedIcon from '@mui/icons-material/AddCircleOutlined';
import AddFriendModal from '../../../components/friends/AddFriendModal';
import React from 'react';

async function fetchRequests(): Promise<{ message: string; data: friend[] }> {
  const resp = await fetch(`${fetchPath}/api/friends/getSent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    // toast.error('Unable To fetch friends!');
    throw new Error('Unable to fetch Outgoing Friend Requests!');
  }
  return resp.json();
}

export default function OutgoingFriendsPanel() {
  const [addOpen, setAddOpen] = React.useState<boolean>(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'outgoing'],
    queryFn: fetchRequests,
    meta: {
      errorMessage: 'Failed to get Outgoing Friend Requests!',
    },
    staleTime: 60 * 1000,
  });

  if (isLoading || isError) return <div />;
  return (
    <Box
      sx={{
        width: 'maxWidth',
        height: 'maxHeight',
        display: 'flex',
        justifyContent: 'center',
        justifyItems: 'center',
        gap: 1,
      }}
    >
      {data?.data.map((friend) => (
        <FriendOutgoingCard
          userId={friend.userID}
          userName={friend.userName}
          imgUrl={friend.imageURl}
          sentAt={new Date(friend.sentAt.replace(' ', 'T') + 'Z')}
          requestId={friend.id}
        />
      ))}

      <Card
        sx={{
          width: 320,
          height: 200,
          backgroundColor: 'black',
          color: 'white',
        }}
      >
        <CardActionArea onClick={(e) => setAddOpen(true)}>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <AddCircleOutlinedIcon sx={{ width: 200, height: 200 }} />
          </Box>
        </CardActionArea>
      </Card>

      <AddFriendModal open={addOpen} onClose={() => setAddOpen(false)} />
      {/* <FriendOutgoingCard userId="1245" userName="Kgamer5911" imgUrl="https://cdn.discordapp.com/avatars/381109499479719940/2aaa432f08750167eb6864ececa49aed.webp" mangaTracked="365" chaptersRead="7856"/>
      <FriendOutgoingCard userId="1245" userName="Jucv" imgUrl="https://cdn.discordapp.com/avatars/456939350744104960/948e186b4133d64068f2d5f1f03bc3b5.webp" mangaTracked="406" chaptersRead="11620"/> */}
    </Box>
  );
}
