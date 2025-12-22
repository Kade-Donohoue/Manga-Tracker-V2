import Box from '@mui/material/Box';
import FriendIncommingCard from '../../../components/friends/FriendIncommingCard';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { friend } from '../../../types';

async function fetchRequests(): Promise<{ message: string; data: friend[] }> {
  const resp = await fetch(`${fetchPath}/api/friends/getRecieved`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    // toast.error('Unable To fetch friends!');
    throw new Error('Unable to fetch Incomming user requests!');
  }
  return resp.json();
}

export default function IncommingFriendsPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'incomming'],
    queryFn: fetchRequests,
    meta: {
      errorMessage: 'Failed to get Incomming friend Requests!',
    },
    staleTime: 20 * 1000,
  });

  if (isLoading || isError || !data) return <div />;
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
        <FriendIncommingCard
          userId={friend.userID}
          userName={friend.userName}
          imgUrl={friend.imageURl}
          sentAt={new Date(friend.sentAt.replace(' ', 'T') + 'Z')}
          requestId={friend.friendId}
        />
      ))}
    </Box>
  );
}
