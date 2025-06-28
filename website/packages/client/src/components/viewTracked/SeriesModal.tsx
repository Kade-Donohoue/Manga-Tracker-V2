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
} from '@mui/material';
import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import { friend, mangaDetails } from '../../types'; // Update path if needed
import { fetchPath } from '../../vars';
import { toast } from 'react-toastify';
import { useQuery, useQueryClient } from '@tanstack/react-query';

interface SeriesModalProps {
  open: boolean;
  manga: mangaDetails | null;
  onUnsetManga: () => void;
  onRemove: () => void;
  onChangeCategory: () => void;
  onChangeChap: () => void;
}

const fetchFriendsData = async (
  manga: mangaDetails | null
): Promise<{ userID: string; currentIndex: number; avatarUrl: string; userName: string }[]> => {
  if (!manga) return [];
  const response = await fetch(`${fetchPath}/api/data/pull/getSharedManga`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      mangaId: manga.mangaId,
    }),
  });

  if (!response.ok) {
    toast.error('Unable to get User Cats');
    throw new Error('Failed to fetch user categories');
  }

  const data: { friendData: { userID: string; currentIndex: number }[]; expiresAt: string } =
    await response.json();

  const joindedData = data.friendData
    .map((indexData) => {
      const match = manga.sharedFriends.find(
        (avatarData) => avatarData.userID === indexData.userID
      );
      return match ? { ...indexData, ...match } : null;
    })
    .filter((u) => u !== null);

  return joindedData;
};

const SeriesModal: React.FC<SeriesModalProps> = ({
  open,
  manga,
  onUnsetManga,
  onRemove,
  onChangeCategory,
  onChangeChap,
}) => {
  const listRef = useRef<HTMLUListElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const queryClient = useQueryClient();

  const [anchorPosition, setAnchorPosition] = React.useState<{
    top: number;
    left: number;
    chapterIndex: number;
  } | null>(null);

  const currentChapterUrl = manga ? manga.urlBase + manga.slugList[manga.currentIndex] : '';

  useEffect(() => {
    if (open && manga) {
      const timer = setTimeout(() => {
        if (listRef.current) {
          const currentChapterElement = listRef.current.querySelector(
            `[data-url="${currentChapterUrl}"]`
          );
          if (currentChapterElement) {
            currentChapterElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [currentChapterUrl, open, manga]);

  const friends = useQuery<
    { userID: string; currentIndex: number; avatarUrl: string; userName: string }[],
    Error
  >({
    queryKey: [manga ? manga.mangaId : null, 'friends'],
    queryFn: () => fetchFriendsData(manga),
    staleTime: 1000 * 60 * 60,
    gcTime: Infinity,
  });

  if (!manga) return null;

  const chapters = manga.slugList.map((slug, index) => ({
    title: manga.chapterTextList[index],
    url: manga.urlBase + slug,
    key: index,
  }));

  const handleChapterClick = (url: string) => {
    window.open(url, '_blank');
  };

  const handleJumpToLatestChapter = () => {
    const latestChapter = chapters[0];
    const targetElement = listRef.current?.querySelector(`[data-url="${latestChapter.url}"]`);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const isChapterRead = (chapterUrl: string) => {
    const currentIndex = chapters.findIndex((chapter) => chapter.url === currentChapterUrl);
    const chapterIndex = chapters.findIndex((chapter) => chapter.url === chapterUrl);
    return chapterIndex >= currentIndex;
  };

  const handleChapterContextMenu = (event: React.MouseEvent, chapterIndex: number) => {
    if (anchorPosition) {
      setAnchorPosition(null);
      return;
    }

    event.preventDefault();
    if (!manga) return;
    setAnchorPosition({ top: event.clientY, left: event.clientX, chapterIndex });
  };

  const handleContextClose = () => {
    setAnchorPosition(null);
  };

  const handleContextOpen = () => {
    if (!manga || !anchorPosition) return;

    const slug = manga.slugList[anchorPosition.chapterIndex] ?? manga.slugList.at(-1);
    const currentUrl = `${manga.urlBase}${slug}`;

    window.open(currentUrl);
    handleContextClose();
  };

  const handleContextMarkRead = async () => {
    const notif = toast.loading('Changing Chapter!');
    handleContextClose();

    if (!manga || !anchorPosition) {
      return toast.update(notif, {
        render: 'No Chapter Selected!',
        type: 'error',
        isLoading: false,
        autoClose: 5000,
      });
    }

    try {
      const reply = await fetch(`${fetchPath}/api/data/update/updateCurrentIndex`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mangaId: manga.mangaId,
          newIndex: anchorPosition.chapterIndex,
          currentChap: manga.chapterTextList[anchorPosition.chapterIndex],
        }),
      });

      if (reply.ok) {
        queryClient.invalidateQueries({ queryKey: ['userManga'] });

        toast.update(notif, {
          render: 'Chapter Successfully Changed!',
          type: 'success',
          isLoading: false,
          autoClose: 5000,
        });
      } else {
        const data: { message: string; url?: string } = await reply.json();
        toast.update(notif, {
          render: data.message || 'Failed to update chapter.',
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

  return (
    <Dialog open={open} onClose={onUnsetManga} maxWidth="md" fullWidth>
      <DialogTitle>
        <Tooltip
          title={manga.mangaName}
          enterDelay={500}
          leaveDelay={200}
          open={tooltipOpen}
          onClose={() => setTooltipOpen(false)}
          onOpen={() => setTooltipOpen(true)}
        >
          <Typography
            variant="h5"
            component="span"
            sx={{
              fontSize: { xs: '1.2rem', sm: '1.5rem' },
              fontWeight: 'bold',
              display: '-webkit-box',
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              WebkitLineClamp: 2,
              textOverflow: 'ellipsis',
              textAlign: 'center',
              overflowWrap: 'break-word',
            }}
            onClick={() => setTooltipOpen(true)}
          >
            {manga.mangaName}
          </Typography>
        </Tooltip>
      </DialogTitle>

      <DialogContent dividers>
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
            <Typography variant="body1" gutterBottom>
              Click on a chapter or jump to the current/latest chapter:
            </Typography>

            <Button
              onClick={handleJumpToLatestChapter}
              variant="contained"
              color="primary"
              fullWidth
              sx={{ mb: 2 }}
            >
              Jump to Latest Chapter
            </Button>

            <Menu
              open={anchorPosition !== null}
              onClose={handleContextClose}
              anchorReference="anchorPosition"
              anchorPosition={
                anchorPosition ? { top: anchorPosition.top, left: anchorPosition.left } : undefined
              }
            >
              <MenuItem onClick={handleContextOpen}>Open</MenuItem>
              <MenuItem onClick={handleContextMarkRead}>Read Up To</MenuItem>
            </Menu>

            <List ref={listRef} sx={{ maxHeight: 400, overflowY: 'auto', mt: 3 }}>
              {chapters.reverse().map((chapter) => (
                <ListItem
                  key={chapter.key}
                  onClick={() => handleChapterClick(chapter.url)}
                  onContextMenu={(e) => handleChapterContextMenu(e, chapter.key)}
                  data-url={chapter.url}
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'transparent',
                    opacity: isChapterRead(chapter.url) ? 0.6 : 1,
                    textDecoration: isChapterRead(chapter.url) ? 'line-through' : 'none',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.08)',
                    },
                  }}
                >
                  <ListItemText
                    primary={`Chapter ${chapter.title}`}
                    primaryTypographyProps={{
                      style: {
                        fontWeight: chapter.url === currentChapterUrl ? 'bold' : 'normal',
                        color: chapter.url === currentChapterUrl ? '#1976d2' : 'inherit',
                        fontSize: '14px',
                      },
                    }}
                  />
                  <AvatarGroup max={4}>
                    {friends.data
                      ?.filter(
                        (val: { userID: string; currentIndex: number; avatarUrl: string }) =>
                          val.currentIndex === chapter.key
                      )
                      .map((friend) => (
                        <Tooltip title={friend.userName}>
                          <Avatar
                            alt={friend.userName}
                            src={friend.avatarUrl}
                            sx={{ width: 24, height: 24 }}
                          />
                        </Tooltip>
                      ))}
                  </AvatarGroup>
                  {isChapterRead(chapter.url) && (
                    <IconButton edge="end" aria-label="read" disabled>
                      <CheckCircleIcon style={{ color: '#4caf50' }} />
                    </IconButton>
                  )}
                </ListItem>
              ))}
              {/* <ListItem>{friends.data ? JSON.stringify(friends.data) : 'no Data!'}</ListItem> */}
            </List>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          '& > button': {
            alignSelf: 'stretch', // ensures all buttons match the tallest one
          },
        }}
      >
        <Button onClick={onRemove} color="error" variant="contained">
          Remove
        </Button>
        <Button onClick={onChangeChap} color="primary" variant="contained">
          Mark Chapters as Read
        </Button>
        <Button onClick={onChangeCategory} color="primary" variant="contained">
          Change Category
        </Button>
        <Button onClick={onUnsetManga} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SeriesModal;
