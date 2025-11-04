import React from 'react';
import { categoryOption, dropdownOption, mangaDetails } from '../../types';
import { fetchPath } from '../../vars';

import Avatar from '@mui/material/Avatar';
import AvatarGroup from '@mui/material/AvatarGroup';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import { useUISetting } from '../../hooks/useUiSetting';

interface Props {
  data: mangaDetails;
  handleContextMenu: (e: React.MouseEvent, mangaId: string) => void;
  openMangaOverview: (mangaId: string) => void;
  catOptions: categoryOption[] | undefined;
}

export default function SeriesCard({
  data,
  handleContextMenu,
  openMangaOverview,
  catOptions,
}: Props) {
  const [progressBarEnabled] = useUISetting('progressBarEnabled', true);
  const [compactCardsEnabled] = useUISetting('compactCardsEnabled', false);

  const findCat = (catVal: string): dropdownOption => {
    return (
      catOptions?.find((cat) => cat.value === catVal) || {
        value: 'unknown',
        label: 'Unknown',
      }
    );
  };

  const checkIndexInRange = (index: number, listLength: number) => {
    if (index < 0) return 0;
    if (index < listLength) return index;
    return listLength - 1;
  };

  const handleAuxClick = (event: React.MouseEvent, mangaId: string) => {
    if (!data) return;
    if (event.button === 1) {
      event.preventDefault();
      let currentUrl = `${data?.urlBase}${
        data?.slugList[data.currentIndex + 1] || data?.slugList.at(-1)
      }`;
      window.open(currentUrl);
    }
  };

  const currentChapterStr = data.chapterTextList[
    checkIndexInRange(data.currentIndex, data.chapterTextList.length)
  ]
    .match(/[0-9.]+/g)
    ?.join('.');
  const totalChaptersStr = data.chapterTextList[data.chapterTextList.length - 1]
    .match(/[0-9.]+/g)
    ?.join('.');

  const currentChapter = currentChapterStr ? parseFloat(currentChapterStr) : 0;
  const totalChapters = totalChaptersStr ? parseFloat(totalChaptersStr) : 0;

  const progress =
    typeof currentChapter === 'number' && typeof totalChapters === 'number' && totalChapters > 0
      ? Math.max(0, Math.min(100, (currentChapter / totalChapters) * 100))
      : 0;

  return (
    <Card
      elevation={3}
      sx={{
        width: 280,
        borderRadius: 2,
        overflow: 'visible',
        position: 'relative',
        bgcolor: 'background.paper',
      }}
      onContextMenu={(e) => handleContextMenu(e, data.mangaId)}
    >
      <CardActionArea
        onClick={() => openMangaOverview(data.mangaId)}
        onAuxClick={(e) => handleAuxClick(e, data.mangaId)}
        sx={{ display: 'block', textAlign: 'left' }}
      >
        {/* Card Media Container*/}
        <Box
          sx={{
            width: '100%',
            height: compactCardsEnabled ? 150 : 0,
            paddingTop: compactCardsEnabled ? 0 : `${(720 / 480) * 100}%`, // maintain 480:720 (2:3) aspect ratio
            position: 'relative',
            overflow: 'hidden',
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            backgroundColor: 'grey.200',
          }}
        >
          <CardMedia
            component="img"
            image={`${
              fetchPath === '/.proxy' ? '/.proxy/image' : import.meta.env.VITE_IMG_URL
            }/${data.mangaId}/${data.imageIndexes.includes(data.userCoverIndex) ? data.userCoverIndex : data.imageIndexes.at(-1) || 0}`}
            alt={`Cover for ${data.mangaName}`}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: compactCardsEnabled ? 350 : '100%',
              objectFit: 'cover',
              display: 'block',
            }}
            loading="lazy"
          />
          {/* Category chip on top-left */}
          {data.userCat && (
            <Chip
              label={findCat(data.userCat)?.label}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                left: 8,
                bgcolor: 'rgba(0,0,0,0.65)',
                color: findCat(data.userCat)?.color || 'common.white',
                fontWeight: 600,
                borderRadius: 1,
              }}
            />
          )}
        </Box>

        <CardContent sx={{ pt: 1, pb: 2 }}>
          <Stack spacing={0.5}>
            <Typography
              variant="subtitle1"
              component="h3"
              noWrap
              title={data.userTitle ? data.userTitle : data.mangaName}
              sx={{ fontWeight: 700 }}
            >
              {data.userTitle ? data.userTitle : data.mangaName}
            </Typography>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Chapter: {currentChapter ?? '—'} / {totalChapters ?? '—'}
              </Typography>

              <AvatarGroup max={4} sx={{ '& .MuiAvatar-root': { width: 16, height: 16 } }}>
                {data.sharedFriends
                  .filter((val) => val)
                  .map((friend) => (
                    <Tooltip key={friend.userID} title={friend.userName}>
                      <Avatar alt={friend.userName} src={friend.avatarUrl} />
                    </Tooltip>
                  ))}
              </AvatarGroup>
            </Box>

            {progressBarEnabled ? (
              <Box sx={{ width: '100%', mt: 1 }}>
                <LinearProgress variant="determinate" value={progress} />
              </Box>
            ) : (
              <div />
            )}
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  );
}
