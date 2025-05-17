import Box from '@mui/material/Box';
import FriendCard from '../../../components/friends/FriendCard';
import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { friend } from '../../../types';

async function fetchFriends(): Promise<{message: string, data: friend[]}> {
  const resp = await fetch(`${fetchPath}/api/friends/getFriends`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  })
  if (!resp.ok) {
    toast.error('Unable To fetch friends!')
    throw new Error('Unable to fetch User Stats!')
  }
  return resp.json()
}


export default function FriendsPanel() {

  const { data, isLoading, isError } = useQuery({
    queryKey: ['friends', 'accepted'],
    queryFn: fetchFriends,
    staleTime: 30*1000
  })

  if (isLoading || isError) return (<div/>)
  return (
    <Box sx={{width:"maxWidth", height:"maxHeight", display: 'flex', justifyContent: 'center', justifyItems: 'center', gap: 1}}>

      {data?.data.map((friend) => (
        <FriendCard 
          friend={friend}
        />
      ))}
    </Box>
  );
}
