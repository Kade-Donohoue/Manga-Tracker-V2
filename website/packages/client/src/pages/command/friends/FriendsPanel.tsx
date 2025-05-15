import Box from '@mui/material/Box';
import FriendCard from '../../../components/friends/FriendCard';
import { useQuery } from '@tanstack/react-query';
import { fetchPath } from '../../../vars';
import { toast } from 'react-toastify';
import { friend } from '../../../types';

async function fetchFriends(): Promise<{message: string, results: friend[]}> {
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
    staleTime: 5*60*1000
  })

  if (isLoading || isError) return (<div/>)
  return (
    <Box sx={{width:"maxWidth", height:"maxHeight", display: 'flex', justifyContent: 'center', justifyItems: 'center', gap: 1}}>

      {data?.results.map((friend) => (
        <FriendCard 
          userId={friend.userID} 
          userName={friend.userName} 
          imgUrl={friend.imageURl} 
          mangaTracked="365" 
          chaptersRead="7856"
        />
      ))}

      {/* <FriendCard userId="1245" userName="Kgamer5911" imgUrl="https://cdn.discordapp.com/avatars/381109499479719940/2aaa432f08750167eb6864ececa49aed.webp" mangaTracked="365" chaptersRead="7856"/>
      <FriendCard userId="1245" userName="Jucv" imgUrl="https://cdn.discordapp.com/avatars/456939350744104960/948e186b4133d64068f2d5f1f03bc3b5.webp" mangaTracked="406" chaptersRead="11620"/> */}
    </Box>
  );
}
