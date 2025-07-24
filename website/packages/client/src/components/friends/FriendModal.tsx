import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Card,
  Grid,
  CardMedia,
  CardActionArea,
  CardContent,
  SvgIcon,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CancelIcon from '@mui/icons-material/Cancel'

import { friend, mangaDetails } from '../../types'; // Update path if needed
import { fetchPath } from '../../vars';
import { toast } from 'react-toastify';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { StatCard } from '../statcard';
import AddTrackedManga from '../AddTrackedManga';
import { Flag } from '@mui/icons-material';

interface friendModalProps {
  open: boolean;
  onCloseFriend: () => void;
  friend: friend|undefined;
}

type friendManga = {
  id: number,
  mangaName: string;
  status: string;
  mangaId: string;
  urlBase: string;
  slugList: string[];
  chapterTextList: string[]
}
type friendData = {
  recomendations: {
    received: friendManga[],
    sent: friendManga[],
  },
  stats: {
    readChapters: number;
    trackedChapters: number;
    readThisMonth: number;
    averagePerDay: number;
  }
};

const fetchFriendsData = async (friendId: string): Promise<friendData> => {
  if (!friendId) return {recomendations: {received: [], sent: []}, stats: {readChapters: 0, trackedChapters: 0, readThisMonth: 0, averagePerDay: 0}};
  const response = await fetch(`${fetchPath}/api/friends/getFriendDetails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      friendId: friendId,
    }),
  });

  if (!response.ok) {
    toast.error('Unable to get Friend');
    throw new Error('Failed to fetch Friend');
  }
  const results = (await response.json()) as { message: string; data: friendData };

  return results.data;
};

const FriendModal: React.FC<friendModalProps> = ({ open, onCloseFriend, friend }) => {
  const queryClient = useQueryClient();

  const {
    data: friendData,
    isLoading,
    isError,
  } = useQuery<friendData, Error>({
    queryKey: [friend ? friend?.userID : null, 'friends'],
    queryFn: () => fetchFriendsData(friend ? friend?.userID:''),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

  const updateStatus = async (recId: number|undefined, friendId: string, newStatus: string) => {
    handleMenuCloseRec()
    const notif = toast.loading('Updating!');

    if (!recId) {
      return toast.update(notif, {
        render: 'No Manga Selected!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    try {
      const reply = await fetch(`${fetchPath}/api/friends/updateRecomendedStatus`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          recId: recId,
          newStatus: newStatus,
        }),
      });

      if (reply.ok) {
        // queryClient.invalidateQueries({ queryKey: ['userManga'] });
        queryClient.invalidateQueries({ queryKey: [friendId] });

        const replyBody: {message: string} = await reply.json()

        toast.update(notif, {
          render: replyBody.message,
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        const data: { message: string; url?: string } = await reply.json();
        toast.update(notif, {
          render: data.message || 'Failed to update Manga.',
          type: 'error',
          isLoading: false,
          autoClose: 5000,
        });
      }
    } catch (err) {
      console.error(err);
      toast.update(notif, {
        render: 'An Unknown Error has Occurred',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }
  }; 

  const [menuAnchorRec, setMenuAnchorRec] = useState<null | HTMLElement>(null);
  const [selectedManga, setSelectedManga] = useState<null | friendManga>(null);
  const [menuAnchorSent, setMenuAnchorSent] = useState<null | HTMLElement>(null);


  const [addModalOpen, setAddModalOpen] = useState<boolean>(false);


  if (isError || isLoading || !friendData) return <div />;

  const handleMenuOpenRec = (event: React.MouseEvent<any>, manga: friendManga) => {
    event.preventDefault();
    setMenuAnchorRec(event.currentTarget);
    setSelectedManga(manga);
  };

  const handleMenuCloseRec = () => {
    setMenuAnchorRec(null);
    // setSelectedManga(null);
  };

  const handleMenuOpenSent = (event: React.MouseEvent<any>, manga: friendManga) => {
    event.preventDefault();
    setMenuAnchorSent(event.currentTarget);
    setSelectedManga(manga);
  };

  const handleMenuCloseSent = () => {
    setMenuAnchorSent(null);
    // setSelectedManga(null);
  };

  if (isLoading || isError) return <div/>

  return (
    <Dialog open={open} onClose={onCloseFriend} fullWidth maxWidth="md">
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={2}>
          <Avatar alt={friend?.userName} src={friend?.imageURl}></Avatar>
          <Typography variant="h6">{friend?.userName}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Stats Section */}
        <Typography variant="subtitle1" gutterBottom>Stats</Typography>
        <Grid container spacing={2}>
          {friendData.stats? Object.entries(friendData?.stats).map(([key, value], index) => (
            // <Grid item xs={6} sm={4} md={4} key={index}>
              <StatCard label={key} value={value} key={index} />
            // </Grid>
          )):<div/>}
        </Grid>

        {/* Recommended Manga Section */}
        <Box mt={4}>
          <Typography variant="subtitle1" gutterBottom>Incoming Recommendations</Typography>
          {friendData.recomendations && friendData?.recomendations.received.length >0?
          <Grid container spacing={2}>
            {friendData.recomendations.received.map(manga => (
              <Grid item xs={12} sm={6} md={3} key={manga.mangaId}>
                <Card onContextMenu={(e) => handleMenuOpenRec(e, manga)} sx={{position: 'relative'}}>
                  <CardActionArea onClick={() => window.open(`${manga.urlBase}/${manga.slugList[0]}`, '_blank')}>
                    <CardMedia
                      component="img"
                      height="180"
                      image={`${import.meta.env.VITE_IMG_URL}/${manga.mangaId}/${0}` ||
                            'mangaNotFoundImage.png'}
                      alt={manga.mangaName}
                    />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <Box>
                        <Typography variant="h6" noWrap>{manga.mangaName}</Typography>
                        <Typography variant="body2" noWrap>{`Chapters: ${manga.chapterTextList.at(-1)}`}</Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <IconButton size="small" onClick={(e) => handleMenuOpenRec(e, manga)} sx={{position: 'absolute', bottom: 5, right: 5}}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
            </Grid>
            :<Typography variant="subtitle1" gutterBottom>No Recomendations</Typography>
          }
        </Box>

        {/* Sent Recommended Manga Section */}
        <Box mt={4}>
          <Typography variant="subtitle1" gutterBottom>Outgoing Recommendations</Typography>
          {friendData.recomendations && friendData?.recomendations.sent.length >0?
          <Grid container spacing={2}>
            {friendData.recomendations.sent.map(manga => (
              <Grid item xs={12} sm={6} md={3} key={manga.mangaId}>
                <Card onContextMenu={(e) => handleMenuOpenSent(e, manga)} sx={{position: 'relative'}}>
                  <CardActionArea onClick={() => window.open(`${manga.urlBase}/${manga.slugList[0]}`, '_blank')}>
                    <CardMedia
                      component="img"
                      height="180"
                      image={`${import.meta.env.VITE_IMG_URL}/${manga.mangaId}/${0}` ||
                            'mangaNotFoundImage.png'}
                      alt={manga.mangaName}
                    />
                    <CardContent sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      <Box>
                        <Typography variant="h6" noWrap>{manga.mangaName}</Typography>
                        <Typography variant="body2" noWrap>{`Status: ${manga.status}`}</Typography>
                      </Box>
                    </CardContent>
                  </CardActionArea>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <IconButton size="small" onClick={(e) => handleMenuOpenSent(e, manga)} sx={{position: 'absolute', bottom: 5, right: 5}}>
                      <MoreVertIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Card>
              </Grid>
            ))}
            </Grid>
            :<Typography variant="subtitle1" gutterBottom>Nothing Sent</Typography>
          }
        </Box>

        {/* Action Menu Received Manga */}
        <Menu
          anchorEl={menuAnchorRec}
          open={Boolean(menuAnchorRec)}
          onClose={handleMenuCloseRec}
        >
          <MenuItem onClick={() => { setAddModalOpen(true); handleMenuCloseRec(); }}>
            Start Tracking
          </MenuItem>
          <MenuItem onClick={() => {updateStatus(selectedManga?.id, friend? friend.userID:'', 'ignored')} }>
            Ignore
          </MenuItem>
          {/* <MenuItem onClick={handleMenuCloseRec}>Close</MenuItem> */}
        </Menu>
        {/* Action Menu Sent Manga */}
        <Menu
          anchorEl={menuAnchorSent}
          open={Boolean(menuAnchorSent)}
          onClose={handleMenuCloseSent}
        >
          <MenuItem onClick={() => {updateStatus(selectedManga?.id, friend ? friend.userID:'', 'canceled')} }>
            Cancel
          </MenuItem>
          {/* <MenuItem onClick={handleMenuCloseSent}>Close</MenuItem> */}
        </Menu>
      </DialogContent>
      <SvgIcon onClick={onCloseFriend} sx={{ position: 'absolute', top: 10, right: 10 }}>
        <CancelIcon sx={{ color: 'white' }} />
      </SvgIcon>
      <AddTrackedManga open={addModalOpen} onClose={() => setAddModalOpen(false)}  manga={selectedManga} friendId={friend? friend?.userID:''}></AddTrackedManga>
    </Dialog>
  );
};

export default FriendModal;
