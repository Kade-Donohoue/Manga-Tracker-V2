import Box from '@mui/material/Box';
import FriendCard from '../../../components/friends/FriendCard';
import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { friend } from '../../../types';
import { useFriends } from '../../../hooks/useFriends';
import { useScrollHandler } from '../../../hooks/useScrollHandler';
import { useState } from 'react';
import FriendModal from '../../../components/friends/FriendModal';

export default function FriendsPanel() {
  const { data, isLoading, isError } = useFriends();

  const [friendOpen, setFriendOpen] = useState<string | undefined>(undefined);

  if (isLoading || isError) return <div />;
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        justifyItems: 'center',
        gap: 1,
        flexWrap: 'wrap',
      }}
    >
      <FriendModal
        open={Boolean(friendOpen)}
        onCloseFriend={() => setFriendOpen(undefined)}
        friend={data?.data.find((f) => f.userID === friendOpen)}
      />
      {data?.data.map((friend) => <FriendCard friend={friend} openFriend={setFriendOpen} />)}
    </Box>
  );
}
