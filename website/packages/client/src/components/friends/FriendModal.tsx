import React, { useRef, useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  Card,
  Grid,
  CardMedia,
  CardActionArea,
  ButtonBase,
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { friend, mangaDetails } from '../../types'; // Update path if needed
import { fetchPath } from '../../vars';
import { toast } from 'react-toastify';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowBack, ArrowForward } from '@mui/icons-material';
import { StatCard } from '../statcard';

interface friendModalProps {
  open: boolean;
  onCloseFriend: () => void;
  friend: friend;
}

type friendData = {
  mangaName: string;
  mangaId: string;
  urlBase: string;
  slugList: string[];
};

const fetchFriendsData = async (friendId: string): Promise<friendData[]> => {
  if (!friendId) return [];
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
  const results = (await response.json()) as { message: string; data: friendData[] };

  return results.data;
};

const FriendModal: React.FC<friendModalProps> = ({ open, onCloseFriend, friend }) => {
  // const queryClient = useQueryClient();

  const {
    data: friendData,
    isLoading,
    isError,
  } = useQuery<friendData[], Error>({
    queryKey: [friend ? friend?.userID : null, 'friends'],
    queryFn: () => fetchFriendsData(friend?.userID),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

  const [mangaIndex, setMangaIndex] = useState(0);

  if (isError || isLoading || !friendData) return <div />;

  const handlePrev = () => {
    setMangaIndex((i) => (i === 0 ? friendData.length - 1 : i - 1));
  };

  const handleNext = () => {
    setMangaIndex((i) => (i + 1) % friendData.length);
  };

  const currentManga = friendData[mangaIndex];

  return (
    <Dialog open={open} onClose={onCloseFriend} maxWidth="md" fullWidth>
      <DialogTitle>
        <Tooltip
          title={friend?.userName}
          enterDelay={500}
          leaveDelay={200}
          // open={tooltipOpen}
          // onClose={() => setTooltipOpen(false)}
          // onOpen={() => setTooltipOpen(true)}
        >
          <Box sx={{ justifyContent: 'center', display: 'flex' }}>
            <Avatar alt={friend?.userName} src={friend?.imageURl} sx={{ mx: 2 }} />

            <Typography
              variant="h4"
              component="span"
              sx={{
                // fontSize: { xs: '1.2rem', sm: '1.5rem' },
                fontWeight: 'bold',
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                WebkitLineClamp: 2,
                textOverflow: 'ellipsis',
                textAlign: 'center',
                overflowWrap: 'break-word',
              }}
              // onClick={() => setTooltipOpen(true)}
            >
              {friend?.userName}
            </Typography>
          </Box>
        </Tooltip>
      </DialogTitle>
      <DialogContent dividers>
        {/* Stat Cards */}
        {/* <Typography variant="h6" gutterBottom> */}
        {/* Stats */}
        {/* </Typography> */}
        {/* <Grid container spacing={2}> */}
        {/* {stats.map((stat, index) => ( */}
        {/* <Grid item xs={6} sm={4} md={3} key={index}>
            <StatCard label={'Test Stat'} value={123456} />
          </Grid> */}
        {/* ))} */}
        {/* </Grid> */}

        {/* Manga Recommendation */}
        <Box mt={4}>
          <Typography variant="h6" gutterBottom>
            Recommended Manga {`${mangaIndex + 1}/${friendData.length}`}
          </Typography>
          {friendData.length > 0 ? (
            <Card variant="outlined" sx={{ p: 2 }}>
              <Grid container alignItems="stretch">
                {/* Left Arrow */}
                <Grid item>
                  <ButtonBase
                    onClick={handlePrev}
                    sx={{
                      height: '100%',
                      // px: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      // boxShadow: 2,
                      display: 'flex',
                      '&:hover': {
                        bgcolor: '#252525', // or any other MUI palette color
                        boxShadow: 4,
                      },
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    focusRipple
                  >
                    <ArrowBack />
                  </ButtonBase>
                </Grid>

                {/* Main Content */}
                <Grid item xs>
                  <CardActionArea
                    onClick={() =>
                      window.open(`${currentManga.urlBase}/${currentManga.slugList[0]}`, '_blank')
                    }
                    sx={{ px: 2 }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      {currentManga.mangaId && (
                        <Grid item xs={12} sm={4}>
                          <CardMedia
                            component="img"
                            image={
                              `${import.meta.env.VITE_IMG_URL}/${currentManga.mangaId}/${0}` ||
                              'mangaNotFoundImage.png'
                            }
                            alt={currentManga.mangaName}
                            sx={{
                              borderRadius: 2,
                              maxHeight: 720,
                              objectFit: 'cover',
                              width: '100%',
                            }}
                          />
                        </Grid>
                      )}
                      <Grid item xs={12} sm={currentManga.mangaId ? 8 : 12}>
                        <Typography variant="h6">{currentManga.mangaName}</Typography>
                      </Grid>
                    </Grid>
                  </CardActionArea>
                </Grid>

                {/* Right Arrow */}
                <Grid item>
                  <ButtonBase
                    onClick={handleNext}
                    sx={{
                      height: '100%',
                      // px: 1,
                      bgcolor: 'background.paper',
                      borderRadius: 1,
                      // boxShadow: 2,
                      display: 'flex',
                      '&:hover': {
                        bgcolor: '#252525', // or any other MUI palette color
                        boxShadow: 4,
                      },
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    focusRipple
                  >
                    <ArrowForward />
                  </ButtonBase>
                </Grid>
              </Grid>
            </Card>
          ) : (
            <Typography color="text.secondary">No recommendations yet.</Typography>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCloseFriend} color="primary">
          Close
        </Button>
      </DialogActions>

      {/* <DialogContent dividers>
        <Box display="flex" flexDirection={{ xs: 'column', sm: 'row' }} gap={3}>
          <Box>
            <img
              src={
                `${import.meta.env.VITE_IMG_URL}/${manga.mangaId}/${manga.imageIndexes?.at(-1) || 0}` ||
                'mangaNotFoundImage.png'
              }
              alt={manga.mangaName}
              style={{
                width: '100%',
                maxWidth: '360px',
                height: 'auto',
                borderRadius: 16,
                objectFit: 'cover',
              }}
            /> 
          </Box>

          <Box flex={1} sx={{ overflowY: 'auto', maxHeight: '60vh' }}>
            {JSON.stringify(friends?.data)}
          </Box>
        </Box>
      </DialogContent> */}
    </Dialog>
  );
};

export default FriendModal;
