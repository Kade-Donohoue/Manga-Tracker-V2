import Box from '@mui/material/Box';
import FriendIncommingCard from '../../../components/friends/FriendIncommingCard';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { useQuery } from '@tanstack/react-query';
import { friend } from '../../../types';

async function fetchRequests(): Promise<{ message: string; data: friend[] }> {
  const resp = await fetch(`${fetchPath}/api/friends/getRecieved`, {
    method: 'P0ST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  if (!resp.ok) {
    toast.error('Unable To fetch friends!');
    throw new Error('Unable to fetch User Stats!');
  }
  return resp.json();
}

export default function IncommingFriendsPanel() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'incomming'],
    queryFn: fetchRequests,
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
          requestId={friend.id}
        />
      ))}

      {/* <FriendIncommingCard userId="1245" userName="Kgamer5911" imgUrl="https://cdn.discordapp.com/avatars/381109499479719940/2aaa432f08750167eb6864ececa49aed.webp" mangaTracked="365" chaptersRead="7856"/>
      <FriendIncommingCard userId="1245" userName="Jucv" imgUrl="https://cdn.discordapp.com/avatars/456939350744104960/948e186b4133d64068f2d5f1f03bc3b5.webp" mangaTracked="406" chaptersRead="11620"/> */}
    </Box>
  );
}
