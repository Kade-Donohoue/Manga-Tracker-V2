import Box from '@mui/material/Box';
import FriendCard from '../../../components/friends/FriendCard';
import { useFriends } from '../../../hooks/useFriends';
import { useState } from 'react';
import FriendModal from '../../../components/friends/FriendModal';
import FriendCardSkeleton from '../../../components/friends/FriendCardSkeleton';

export default function FriendsPanel() {
  const { data, isLoading, isError } = useFriends();

  const [friendOpen, setFriendOpen] = useState<string | undefined>(undefined);

  if (isLoading)
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
        {Array.from({ length: 12 }).map((_, index) => (
          <FriendCardSkeleton key={index} />
        ))}
      </Box>
    );

  if (isError) return <div />;

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
