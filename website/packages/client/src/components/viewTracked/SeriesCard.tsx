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
import IconButton from '@mui/material/IconButton';
import MoreVertIcon from '@mui/icons-material/MoreVert';

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

  return (
    <Card
      sx={{
        width: 320,
        height: 350,
        backgroundColor: 'black',
        color: 'white',
        position: 'relative',
      }}
      onContextMenu={(e) => handleContextMenu(e, data.mangaId)}
    >
      <CardActionArea
        onClick={() => openMangaOverview(data.mangaId)}
        onAuxClick={(e) => handleAuxClick(e, data.mangaId)}
      >
        <CardMedia
          component="img"
          height="200"
          image={`${
            fetchPath === '/.proxy' ? '/.proxy/image' : import.meta.env.VITE_IMG_URL
          }/${data.mangaId}/${data.imageIndexes.includes(data.userCoverIndex)?data.userCoverIndex:data.imageIndexes.at(-1)||0}`}
          alt={`Cover for ${data.mangaName}`}
          style={{ objectPosition: 'top' }}
          loading="lazy"
        />
        <CardContent
          sx={{
            height: 150,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            paddingBottom: '8px !important',
          }}
        >
          {/* Title */}
          <Box sx={{ overflow: 'hidden' }}>
            <Tooltip title={data.userTitle ? data.userTitle : data.mangaName} enterDelay={700}>
              <Typography
                gutterBottom
                variant="h5"
                component="div"
                sx={{
                  display: '-webkit-box',
                  WebkitBoxOrient: 'vertical',
                  WebkitLineClamp: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxHeight: '2.6em',
                }}
              >
                {data.userTitle ? data.userTitle : data.mangaName}
              </Typography>
            </Tooltip>
          </Box>

          {/* Bottom content (chapter/category/avatars) */}
          <Box
            sx={{
              fontSize: '0.85rem',
              color: 'lightgray',
              height: '100%',
              marginTop: '10px',
            }}
            onContextMenu={(e) => handleContextMenu(e, data.mangaId)}
          >
            <table style={{ borderSpacing: '5px' }}>
              <tbody>
                <tr>
                  <td>Chapter:</td>
                  <td>
                    {`${data.chapterTextList[
                      checkIndexInRange(data.currentIndex, data.chapterTextList.length)
                    ]
                      .match(/[0-9.]+/g)
                      ?.join('.')}/${data.chapterTextList[data.chapterTextList.length - 1]
                      .match(/[0-9.]+/g)
                      ?.join('.')}`}
                  </td>
                </tr>
                <tr>
                  <td>Category:</td>
                  <td style={{ color: findCat(data.userCat)?.color || 'lightgray' }}>
                    {findCat(data.userCat)?.label}
                  </td>
                </tr>
              </tbody>
            </table>
            <Box sx={{ mt: 1, position: 'absolute', bottom: 0, left: 0, right: 0 }}>
              <AvatarGroup
                max={4}
                sx={{ justifyContent: 'flex-start', bottom: 8, right: 40, position: 'absolute' }}
              >
                {data.sharedFriends
                  .filter((val) => val)
                  .map((friend) => (
                    <Tooltip title={friend.userName}>
                      <Avatar
                        key={friend.userID}
                        alt={friend.userName}
                        src={friend.avatarUrl}
                        sx={{ width: 24, height: 24 }}
                      />
                    </Tooltip>
                  ))}
              </AvatarGroup>
            </Box>
          </Box>
        </CardContent>
      </CardActionArea>
      <IconButton
        sx={{ bottom: 0, right: 0, position: 'absolute' }}
        onClick={(e) => {
          e.stopPropagation();
          handleContextMenu(e, data.mangaId);
        }}
      >
        <MoreVertIcon />
      </IconButton>
    </Card>
  );
}
